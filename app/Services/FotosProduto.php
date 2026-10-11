<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Models\User;
use App\Support\Imagem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Fotos dos produtos: carregar (reduzidas em três tamanhos), escolher a principal, ordenar e apagar.
 * A primeira foto de um produto fica principal; ao apagar a principal, a seguinte passa a sê-lo.
 */
class FotosProduto
{
    public const MAXIMO_POR_PRODUTO = 12;

    public function adicionar(Produto $produto, UploadedFile $ficheiro, User $quem): ProdutoFoto
    {
        try {
            $original = Imagem::abrir($ficheiro->getRealPath());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['fotos' => "{$ficheiro->getClientOriginalName()}: {$e->getMessage()}"]);
        }

        $disco = Storage::disk('local');
        $base = Str::lower((string) Str::ulid());
        $escritos = [];

        try {
            foreach (ProdutoFoto::TAMANHOS as $tamanho => $maximo) {
                $reduzida = Imagem::reduzir($original, $maximo);
                if ($tamanho === 'grande') {
                    [$largura, $altura] = [imagesx($reduzida), imagesy($reduzida)];
                }
                $caminho = "produtos/{$base}-{$tamanho}.webp";
                $disco->put($caminho, Imagem::webp($reduzida));
                $escritos[] = $caminho;
            }

            return DB::transaction(function () use ($produto, $ficheiro, $quem, $base, $largura, $altura, $disco) {
                // Bloqueia o produto: dois carregamentos ao mesmo tempo não ficam ambos "principal"
                Produto::whereKey($produto->id)->lockForUpdate()->first();
                $existentes = $produto->fotos()->count();
                if ($existentes >= self::MAXIMO_POR_PRODUTO) {
                    throw ValidationException::withMessages(['fotos' => 'Cada produto pode ter no máximo '.self::MAXIMO_POR_PRODUTO.' fotos.']);
                }

                $foto = $produto->fotos()->make([
                    'ficheiro' => $base,
                    'nome_original' => Str::limit($ficheiro->getClientOriginalName(), 180, ''),
                    'largura' => $largura,
                    'altura' => $altura,
                    'bytes' => $disco->size("produtos/{$base}-grande.webp"),
                    'principal' => $existentes === 0,
                    'posicao' => (int) $produto->fotos()->max('posicao') + 1,
                ]);
                $foto->carregada_por = $quem->id;
                $foto->save();

                return $foto;
            });
        } catch (Throwable $e) {
            $disco->delete($escritos);
            throw $e;
        }
    }

    public function tornarPrincipal(ProdutoFoto $foto): void
    {
        DB::transaction(function () use ($foto) {
            ProdutoFoto::where('produto_id', $foto->produto_id)->where('id', '!=', $foto->id)->update(['principal' => false]);
            $foto->update(['principal' => true]);
        });
    }

    /** Troca a foto de lugar com a anterior ou a seguinte (pela ordem em que aparecem) */
    public function mover(ProdutoFoto $foto, string $direcao): void
    {
        DB::transaction(function () use ($foto, $direcao) {
            $ordem = ProdutoFoto::where('produto_id', $foto->produto_id)->orderBy('posicao')->orderBy('id')->lockForUpdate()->get();
            $i = $ordem->search(fn (ProdutoFoto $f) => $f->id === $foto->id);
            $j = $direcao === 'anterior' ? $i - 1 : $i + 1;
            if ($i === false || ! isset($ordem[$j])) {
                return;
            }

            // Renumera tudo (1, 2, 3...) com as duas trocadas, para não depender de posições repetidas
            $ids = $ordem->pluck('id')->all();
            [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
            foreach ($ids as $posicao => $id) {
                ProdutoFoto::whereKey($id)->update(['posicao' => $posicao + 1]);
            }
        });
    }

    public function apagar(ProdutoFoto $foto): void
    {
        DB::transaction(function () use ($foto) {
            $foto->delete();
            if ($foto->principal) {
                ProdutoFoto::where('produto_id', $foto->produto_id)->orderBy('posicao')->orderBy('id')->first()?->update(['principal' => true]);
            }
        });

        $this->apagarFicheiros($foto);
    }

    /**
     * Apaga os ficheiros de fotos cujos registos já foram apagados (ex.: ao apagar o produto).
     *
     * @param  iterable<ProdutoFoto>  $fotos
     */
    public function apagarFicheirosDe(iterable $fotos): void
    {
        foreach ($fotos as $foto) {
            $this->apagarFicheiros($foto);
        }
    }

    private function apagarFicheiros(ProdutoFoto $foto): void
    {
        Storage::disk('local')->delete(array_map(fn (string $t) => $foto->caminho($t), array_keys(ProdutoFoto::TAMANHOS)));
    }
}
