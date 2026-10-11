<?php

namespace App\Http\Controllers\Loja;

use App\Models\ContaCliente;
use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

/**
 * O que o site e o catálogo podem mostrar de um produto. Cada campo é escolhido aqui, um a um:
 * nunca sai o preço de compra, as quantidades do armazém, as notas internas nem o resto da ficha.
 */
trait Vitrine
{
    /** Material para alugar marcado "Mostrar na loja" */
    protected function produtosDaLoja(): Builder
    {
        return Produto::query()
            ->where('na_loja', true)
            ->where('tipo', 'produto')
            ->where('em_aluguer', true);
    }

    /** Cliente com conta activa e com "Ver o catálogo com preços e disponibilidade"; null para os visitantes */
    protected function clienteDoCatalogo(): ?ContaCliente
    {
        $conta = Auth::guard('cliente')->user();

        return $conta instanceof ContaCliente && $conta->activa() && $conta->pode('loja.catalogo') ? $conta : null;
    }

    /** Alguém da equipa, com sessão aberta no LemGest e "Ver a loja" (o Administrador tem sempre) */
    protected function equipaNaLoja(): ?User
    {
        $u = Auth::guard('web')->user();

        return $u instanceof User && $u->active && $u->can('loja.ver') ? $u : null;
    }

    /** Preços e disponibilidade: clientes com "Ver o catálogo" e a equipa com "Ver a loja" */
    protected function verPrecos(): bool
    {
        return $this->clienteDoCatalogo() !== null || $this->equipaNaLoja() !== null;
    }

    /** @return array<string, mixed> */
    protected function cartao(Produto $p, bool $comPreco): array
    {
        return [
            'id' => $p->id,
            'nome' => $p->nome,
            'categoria' => $p->categoria?->nome,
            'material' => $p->material?->nome,
            'descricao' => $p->loja_descricao,
            'foto' => $p->fotoPrincipal ? self::urlFoto($p->fotoPrincipal, 'media') : null,
            // Preço por dia com IVA, só para clientes com sessão
            'preco_dia' => $comPreco ? $p->precoAluguerComIva() : null,
        ];
    }

    public static function urlFoto(ProdutoFoto $foto, string $tamanho): string
    {
        return "/catalogo/fotos/{$foto->id}/{$tamanho}?v=".substr($foto->ficheiro, -8);
    }
}
