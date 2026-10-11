<?php

namespace App\Services;

use App\Models\FotoSite;
use App\Models\User;
use App\Support\Imagem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Fotos do site: carregar (reduzidas em três tamanhos), legenda, capa, mostrar/esconder, ordenar e apagar.
 * No máximo FotoSite::MAXIMO_CAPA fotos na capa.
 */
class FotosSite
{
    /** @param  string  $caminho  ficheiro no disco (carregado pelo navegador ou das fotos iniciais) */
    public function adicionar(string $caminho, string $nomeOriginal, ?string $legenda, ?User $quem, bool $capa = false): FotoSite
    {
        if (FotoSite::count() >= FotoSite::MAXIMO) {
            throw ValidationException::withMessages(['fotos' => 'O site pode ter no máximo '.FotoSite::MAXIMO.' fotos. Apague alguma primeiro.']);
        }
        try {
            $original = Imagem::abrir($caminho);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['fotos' => "{$nomeOriginal}: {$e->getMessage()}"]);
        }

        $guardada = Imagem::guardarTamanhos($original, 'site', FotoSite::TAMANHOS);

        try {
            $foto = new FotoSite([
                'ficheiro' => $guardada['base'],
                // Sem legenda, fica o nome do ficheiro (sem a extensão), para se corrigir depois
                'legenda' => Str::limit(trim((string) $legenda) ?: pathinfo($nomeOriginal, PATHINFO_FILENAME), 190, ''),
                'largura' => $guardada['largura'],
                'altura' => $guardada['altura'],
                'bytes' => $guardada['bytes'],
                'capa' => $capa,
                'visivel' => true,
                'posicao' => (int) FotoSite::max('posicao') + 1,
            ]);
            $foto->carregada_por = $quem?->id;
            $foto->save();

            return $foto;
        } catch (Throwable $e) {
            $this->apagarFicheiros($guardada['base']);
            throw $e;
        }
    }

    /** @param array{legenda?: string, capa?: bool, visivel?: bool} $dados */
    public function alterar(FotoSite $foto, array $dados): FotoSite
    {
        return DB::transaction(function () use ($foto, $dados) {
            $foto->fill($dados);
            // Uma foto escondida não pode ficar na capa
            if (! $foto->visivel) {
                $foto->capa = false;
            }
            if ($foto->capa && $foto->isDirty('capa')
                && FotoSite::where('capa', true)->whereKeyNot($foto->id)->lockForUpdate()->count() >= FotoSite::MAXIMO_CAPA) {
                throw ValidationException::withMessages([
                    'capa' => 'A capa já tem '.FotoSite::MAXIMO_CAPA.' fotos. Tire uma da capa antes de pôr esta.',
                ]);
            }
            $foto->save();

            return $foto;
        });
    }

    /** Troca a foto de lugar com a anterior ou a seguinte */
    public function mover(FotoSite $foto, string $direcao): void
    {
        DB::transaction(function () use ($foto, $direcao) {
            $ids = FotoSite::query()->ordenadas()->lockForUpdate()->pluck('id')->all();
            $i = array_search($foto->id, $ids, true);
            $j = $direcao === 'anterior' ? $i - 1 : $i + 1;
            if ($i === false || ! isset($ids[$j])) {
                return;
            }
            [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
            foreach ($ids as $posicao => $id) {
                FotoSite::whereKey($id)->update(['posicao' => $posicao + 1]);
            }
        });
    }

    public function apagar(FotoSite $foto): void
    {
        $foto->delete();
        $this->apagarFicheiros($foto->ficheiro);
    }

    private function apagarFicheiros(string $base): void
    {
        Storage::disk('local')->delete(array_map(fn (string $t) => "site/{$base}-{$t}.webp", array_keys(FotoSite::TAMANHOS)));
    }
}
