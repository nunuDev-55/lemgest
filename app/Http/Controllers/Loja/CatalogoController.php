<?php

namespace App\Http\Controllers\Loja;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Material;
use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Services\Disponibilidade;
use App\Support\Pesquisa;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Catálogo: todos vêem o material com fotos; os clientes com sessão (perfil Cliente → "Ver o catálogo")
 * vêem também o preço por dia e quantas peças estão livres nas datas que escolherem.
 */
class CatalogoController extends Controller
{
    use Vitrine;

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'categoria' => ['nullable', 'integer'],
            'material' => ['nullable', 'integer'],
            'pesquisa' => ['nullable', 'string', 'max:80'],
            'de' => ['nullable', 'date', 'after_or_equal:today'],
            'ate' => ['nullable', 'date', 'after_or_equal:de'],
        ], ['de.after_or_equal' => 'Escolha uma data a partir de hoje.', 'ate.after_or_equal' => 'O fim tem de ser no dia do início ou depois.']);
        $cliente = $this->clienteDoCatalogo();

        $produtos = $this->produtosDaLoja()
            ->with(['categoria:id,nome,ordem', 'material:id,nome', 'fotoPrincipal'])
            ->when($filtros['categoria'] ?? null, fn ($q, $c) => $q->where('categoria_id', $c))
            ->when($filtros['material'] ?? null, fn ($q, $m) => $q->where('material_id', $m))
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where('nome', 'like', Pesquisa::like($t)))
            ->get()
            // Pela ordem das categorias da loja, depois a posição de cada produto e o nome
            ->sortBy(fn (Produto $p) => [$p->categoria?->ordem ?? 9999, $p->loja_ordem ?: 9999, $p->nome])
            ->values();

        return Inertia::render('site/catalogo', [
            'produtos' => $produtos->map(fn (Produto $p) => [
                ...$this->cartao($p, $cliente !== null),
                'disponivel' => null,
            ])->pipe(fn (Collection $lista) => $this->comDisponibilidade($lista, $produtos, $cliente !== null, $filtros)),
            'filtros' => (object) $filtros,
            'categorias' => Categoria::orderBy('ordem')->orderBy('nome')->get(['id', 'nome'])
                ->map(fn (Categoria $c) => ['valor' => (string) $c->id, 'label' => $c->nome]),
            'materiais' => Material::orderBy('ordem')->orderBy('nome')->get(['id', 'nome'])
                ->map(fn (Material $m) => ['valor' => (string) $m->id, 'label' => $m->nome]),
            'podeReservar' => $cliente?->pode('loja.reservar') ?? false,
        ]);
    }

    public function mostrar(Request $request, int $produto): Response
    {
        $p = $this->produtosDaLoja()->with(['categoria:id,nome', 'material:id,nome', 'fotos'])->findOrFail($produto);
        $filtros = $request->validate([
            'de' => ['nullable', 'date', 'after_or_equal:today'],
            'ate' => ['nullable', 'date', 'after_or_equal:de'],
        ]);
        $cliente = $this->clienteDoCatalogo();
        $cartao = $this->comDisponibilidade(collect([$this->cartao($p, $cliente !== null)]), collect([$p]), $cliente !== null, $filtros)->first();

        return Inertia::render('site/produto', [
            'produto' => [
                ...$cartao,
                'fotos' => $p->fotos->map(fn (ProdutoFoto $f) => [
                    'id' => $f->id,
                    'grande' => self::urlFoto($f, 'grande'),
                    'media' => self::urlFoto($f, 'media'),
                    'mini' => self::urlFoto($f, 'mini'),
                ])->values(),
            ],
            'filtros' => (object) $filtros,
            'podeReservar' => $cliente?->pode('loja.reservar') ?? false,
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

    /**
     * Peças livres nas datas escolhidas (só para clientes com sessão).
     *
     * @param  Collection<int, array<string, mixed>>  $cartoes
     * @param  Collection<int, Produto>  $produtos
     * @param  array<string, mixed>  $filtros
     * @return Collection<int, array<string, mixed>>
     */
    private function comDisponibilidade(Collection $cartoes, Collection $produtos, bool $cliente, array $filtros): Collection
    {
        if (! $cliente || empty($filtros['de']) || $produtos->isEmpty()) {
            return $cartoes;
        }
        $contas = app(Disponibilidade::class)->noPeriodo(
            $produtos,
            CarbonImmutable::parse($filtros['de']),
            CarbonImmutable::parse($filtros['ate'] ?? $filtros['de']),
        );

        return $cartoes->map(fn (array $c) => [...$c, 'disponivel' => $contas[$c['id']]['disponivel'] ?? 0]);
    }
}
