<?php

namespace App\Http\Controllers\Loja;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\FotoSite;
use App\Models\Material;
use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Models\Reserva;
use App\Models\ReservaLinha;
use App\Models\User;
use App\Support\Pesquisa;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Catálogo: só com conta (middleware AcessoCatalogo), com o preço por dia de cada peça.
 * As datas e a disponibilidade tratam-se em "A minha reserva" (PedidoController); as fotos são públicas.
 */
class CatalogoController extends Controller
{
    use Vitrine;

    /** Formas de ordenar o catálogo (a primeira é a que vem por omissão) */
    public const ORDENS = [
        'recomendados' => 'Recomendados',
        'pedidos' => 'Mais pedidos',
        'nome' => 'Nome (A–Z)',
        'preco' => 'Preço: mais baixo',
        'preco_desc' => 'Preço: mais alto',
    ];

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'categoria' => ['nullable', 'integer'],
            'material' => ['nullable', 'integer'],
            'pesquisa' => ['nullable', 'string', 'max:80'],
            'ordem' => ['nullable', Rule::in(array_keys(self::ORDENS))],
        ]);
        $cliente = $this->clienteDoCatalogo();

        $produtos = $this->produtosDaLoja()
            ->with(['categoria:id,nome,ordem', 'material:id,nome', 'fotoPrincipal'])
            ->when($filtros['categoria'] ?? null, fn ($q, $c) => $q->where('categoria_id', $c))
            ->when($filtros['material'] ?? null, fn ($q, $m) => $q->where('material_id', $m))
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('nome', 'like', Pesquisa::like($t))->orWhere('loja_descricao', 'like', Pesquisa::like($t))))
            ->get();

        return Inertia::render('site/catalogo', [
            'produtos' => $this->ordenar($produtos, $filtros['ordem'] ?? 'recomendados')
                ->map(fn (Produto $p) => $this->cartao($p, $this->verPrecos()))->values(),
            'filtros' => (object) $filtros,
            // Só as categorias e os materiais com peças na loja (Serviços, por exemplo, não aparece)
            'categorias' => Categoria::whereIn('id', $this->produtosDaLoja()->select('categoria_id'))->orderBy('ordem')->orderBy('nome')->get(['id', 'nome'])
                ->map(fn (Categoria $c) => ['valor' => (string) $c->id, 'label' => $c->nome]),
            'materiais' => Material::whereIn('id', $this->produtosDaLoja()->select('material_id'))->orderBy('ordem')->orderBy('nome')->get(['id', 'nome'])
                ->map(fn (Material $m) => ['valor' => (string) $m->id, 'label' => $m->nome]),
            'ordens' => collect(self::ORDENS)->map(fn ($label, $valor) => ['valor' => $valor, 'label' => $label])->values(),
            // "Material em destaque": as peças marcadas "Em destaque" na ficha do produto, numa fila que desliza
            'destaques' => $this->produtosDaLoja()->where('loja_destaque', true)
                ->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal'])
                ->orderByRaw('loja_ordem = 0')->orderBy('loja_ordem')->orderBy('nome')->limit(12)->get()
                ->map(fn (Produto $p) => $this->cartao($p, $this->verPrecos()))->values(),
            'podeReservar' => $cliente?->pode('loja.reservar') ?? false,
        ]);
    }

    /**
     * @param  Collection<int, Produto>  $produtos
     * @return Collection<int, Produto>
     */
    private function ordenar(Collection $produtos, string $ordem): Collection
    {
        if ($ordem === 'pedidos') {
            // Quantas vezes cada peça entrou em reservas (sem contar as canceladas)
            $vezes = ReservaLinha::query()
                ->whereIn('produto_id', $produtos->pluck('id'))
                ->whereHas('reserva', fn ($q) => $q->where('estado', '!=', Reserva::CANCELADA))
                ->selectRaw('produto_id, count(*) as n')->groupBy('produto_id')->pluck('n', 'produto_id');

            return $produtos->sortBy([fn (Produto $a, Produto $b) => ($vezes[$b->id] ?? 0) <=> ($vezes[$a->id] ?? 0), ['nome', 'asc']]);
        }

        return match ($ordem) {
            'nome' => $produtos->sortBy('nome', SORT_NATURAL | SORT_FLAG_CASE),
            'preco' => $produtos->sortBy([fn (Produto $a, Produto $b) => (float) $a->preco_aluguer <=> (float) $b->preco_aluguer, ['nome', 'asc']]),
            'preco_desc' => $produtos->sortBy([fn (Produto $a, Produto $b) => (float) $b->preco_aluguer <=> (float) $a->preco_aluguer, ['nome', 'asc']]),
            // Recomendados: os em destaque primeiro, depois pela ordem das categorias e a posição de cada peça
            default => $produtos->sortBy(fn (Produto $p) => [$p->loja_destaque ? 0 : 1, $p->categoria?->ordem ?? 9999, $p->loja_ordem ?: 9999, $p->nome]),
        };
    }

    public function mostrar(int $produto): Response
    {
        $p = $this->produtosDaLoja()->with(['categoria:id,nome', 'material:id,nome', 'fotos'])->findOrFail($produto);
        $cliente = $this->clienteDoCatalogo();

        return Inertia::render('site/produto', [
            'produto' => [
                ...$this->cartao($p, $this->verPrecos()),
                'fotos' => $p->fotos->map(fn (ProdutoFoto $f) => [
                    'id' => $f->id,
                    'grande' => self::urlFoto($f, 'grande'),
                    'media' => self::urlFoto($f, 'media'),
                    'mini' => self::urlFoto($f, 'mini'),
                ])->values(),
            ],
            'podeReservar' => $cliente?->pode('loja.reservar') ?? false,
            // Outras peças da mesma categoria (as em destaque primeiro)
            'relacionados' => $this->produtosDaLoja()->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal'])
                ->where('categoria_id', $p->categoria_id)->whereKeyNot($p->id)
                ->orderByDesc('loja_destaque')->orderBy('nome')->limit(8)->get()
                ->map(fn (Produto $r) => $this->cartao($r, $this->verPrecos()))->values(),
        ]);
    }

    /** Fotos públicas: só de material que está na loja, e nunca o ficheiro original carregado */
    public function foto(int $foto, string $tamanho): BinaryFileResponse
    {
        abort_unless(in_array($tamanho, ['grande', 'media', 'mini'], true), 404);
        $f = ProdutoFoto::whereKey($foto)->whereHas('produto', fn ($q) => $q->where('na_loja', true))->firstOrFail();
        $caminho = $f->caminho($tamanho);
        abort_unless(Storage::disk('local')->exists($caminho), 404);

        return response()->file(Storage::disk('local')->path($caminho), [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /** Fotos do site (galeria, capa): as visíveis para todos; as escondidas só para quem gere o site */
    public function fotoSite(int $foto, string $tamanho): BinaryFileResponse
    {
        abort_unless(array_key_exists($tamanho, FotoSite::TAMANHOS), 404);
        $f = FotoSite::findOrFail($foto);
        $equipa = Auth::guard('web')->user();
        abort_unless($f->visivel || ($equipa instanceof User && $equipa->can('loja.gerir')), 404);
        $caminho = $f->caminho($tamanho);
        abort_unless(Storage::disk('local')->exists($caminho), 404);

        return response()->file(Storage::disk('local')->path($caminho), [
            'Content-Type' => 'image/webp',
            'Cache-Control' => $f->visivel ? 'public, max-age=86400' : 'private, no-store',
        ]);
    }
}
