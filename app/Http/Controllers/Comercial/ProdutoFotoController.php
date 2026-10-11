<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Services\FotosProduto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProdutoFotoController extends Controller
{
    public function __construct(private FotosProduto $fotos) {}

    public function store(Request $request, Produto $produto): RedirectResponse
    {
        $request->validate([
            'fotos' => ['required', 'array', 'min:1', 'max:'.FotosProduto::MAXIMO_POR_PRODUTO],
            'fotos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:15360'],
        ], [
            'fotos.required' => 'Escolha pelo menos uma foto.',
            'fotos.max' => 'No máximo :max fotos de cada vez.',
            'fotos.*.mimes' => 'Só se aceitam fotos JPG, PNG ou WebP.',
            'fotos.*.max' => 'Cada foto pode ter no máximo 15 MB.',
            'fotos.*.file' => 'Uma das fotos não chegou bem. Tente de novo.',
        ]);

        $livres = FotosProduto::MAXIMO_POR_PRODUTO - $produto->fotos()->count();
        if (count($request->file('fotos')) > $livres) {
            return back()->withErrors(['fotos' => $livres > 0
                ? "Este produto só pode receber mais {$livres} foto(s) (máximo ".FotosProduto::MAXIMO_POR_PRODUTO.').'
                : 'Este produto já tem o máximo de '.FotosProduto::MAXIMO_POR_PRODUTO.' fotos. Apague alguma primeiro.']);
        }

        $n = 0;
        foreach ($request->file('fotos') as $ficheiro) {
            $this->fotos->adicionar($produto, $ficheiro, $request->user());
            $n++;
        }

        $this->registar($produto, $n === 1 ? 'Foto adicionada' : "{$n} fotos adicionadas");

        return back()->with('sucesso', $n === 1 ? 'Foto adicionada.' : "{$n} fotos adicionadas.");
    }

    public function principal(Produto $produto, ProdutoFoto $foto): RedirectResponse
    {
        $this->daqui($produto, $foto);
        $this->fotos->tornarPrincipal($foto);
        $this->registar($produto, 'Foto principal alterada');

        return back()->with('sucesso', 'Foto principal alterada.');
    }

    public function mover(Request $request, Produto $produto, ProdutoFoto $foto): RedirectResponse
    {
        $this->daqui($produto, $foto);
        $dados = $request->validate(['direcao' => ['required', Rule::in(['anterior', 'seguinte'])]]);
        $this->fotos->mover($foto, $dados['direcao']);

        return back();
    }

    public function destroy(Produto $produto, ProdutoFoto $foto): RedirectResponse
    {
        $this->daqui($produto, $foto);
        $this->fotos->apagar($foto);
        $this->registar($produto, 'Foto apagada');

        return back()->with('sucesso', 'Foto apagada.');
    }

    /** Envia um dos tamanhos da foto. O ficheiro de cada foto nunca muda, por isso o navegador pode guardá-lo muito tempo. */
    public function mostrar(ProdutoFoto $foto, string $tamanho): BinaryFileResponse
    {
        abort_unless(array_key_exists($tamanho, ProdutoFoto::TAMANHOS), 404);
        $caminho = $foto->caminho($tamanho);
        abort_unless(Storage::disk('local')->exists($caminho), 404);

        return response()->file(Storage::disk('local')->path($caminho), [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'private, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function daqui(Produto $produto, ProdutoFoto $foto): void
    {
        abort_unless($foto->produto_id === $produto->id, 404);
    }

    private function registar(Produto $produto, string $descricao): void
    {
        activity('produtos')->performedOn($produto)->causedBy(request()->user())->event('updated')->log($descricao);
    }
}
