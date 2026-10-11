<?php

namespace App\Http\Controllers\Loja;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Produto;
use Inertia\Inertia;
use Inertia\Response;

/** Página inicial pública da LemServ: apresentação, serviços, categorias, destaques e contactos */
class SiteController extends Controller
{
    use Vitrine;

    public function inicio(): Response
    {
        $comPreco = $this->verPrecos();
        $base = fn () => $this->produtosDaLoja()->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal']);

        return Inertia::render('site/inicio', [
            'destaques' => $base()->where('loja_destaque', true)
                ->orderByRaw('loja_ordem = 0')->orderBy('loja_ordem')->orderBy('nome')->limit(8)->get()
                ->map(fn (Produto $p) => $this->cartao($p, $comPreco))->values(),
            // Categorias com material na loja, cada uma com uma foto para a entrada
            'categorias' => Categoria::orderBy('ordem')->orderBy('nome')->get(['id', 'nome', 'descricao'])
                ->map(function (Categoria $c) use ($base) {
                    $produtos = $base()->where('categoria_id', $c->id);
                    $comFoto = (clone $produtos)->whereHas('fotos')->orderByRaw('loja_destaque desc')->first();

                    return [
                        'id' => $c->id,
                        'nome' => $c->nome,
                        'descricao' => $c->descricao,
                        'n' => $produtos->count(),
                        'foto' => $comFoto?->fotoPrincipal ? self::urlFoto($comFoto->fotoPrincipal, 'media') : null,
                    ];
                })
                ->filter(fn ($c) => $c['n'] > 0)->values(),
            // Serviços marcados "Mostrar na loja" (montagem, decoração...): só o nome e a descrição
            'servicos' => Produto::where('na_loja', true)->where('tipo', 'servico')->orderBy('loja_ordem')->orderBy('nome')
                ->get(['id', 'nome', 'loja_descricao'])
                ->map(fn (Produto $s) => ['id' => $s->id, 'nome' => $s->nome, 'descricao' => $s->loja_descricao]),
        ]);
    }
}
