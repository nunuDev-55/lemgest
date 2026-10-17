<?php

namespace App\Http\Controllers\Loja;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use App\Models\Produto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Favoritos (♡): o cliente guarda peças do catálogo para as ver depois em A minha conta → Favoritos */
class FavoritoController extends Controller
{
    use Vitrine;

    public function index(Request $request): Response
    {
        /** @var ContaCliente $conta */
        $conta = $request->user('cliente');
        $ids = $conta->favoritos()->pluck('produtos.id');
        // Só as que ainda estão na loja: uma peça retirada da loja deixa de aparecer (e volta se regressar à loja)
        $produtos = $this->produtosDaLoja()->whereIn('id', $ids)->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal'])->get()
            ->sortBy(fn (Produto $p) => $ids->search($p->id))
            ->map(fn (Produto $p) => $this->cartao($p, $this->verPrecos()))
            ->values();

        return Inertia::render('conta/favoritos', ['produtos' => $produtos]);
    }

    /** Guarda a peça nos favoritos ou tira-a, se já lá estava */
    public function alternar(Request $request, int $produto): RedirectResponse
    {
        $peca = $this->produtosDaLoja()->findOrFail($produto);
        /** @var ContaCliente $conta */
        $conta = $request->user('cliente');
        $mudou = $conta->favoritos()->toggle([$peca->id]);

        return back()->with('sucesso', $mudou['attached'] !== []
            ? "{$peca->nome}: guardada nos seus favoritos (A minha conta → Favoritos)."
            : "{$peca->nome}: saiu dos seus favoritos.");
    }
}
