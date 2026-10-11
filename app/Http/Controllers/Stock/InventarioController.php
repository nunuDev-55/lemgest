<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\Inventario;
use App\Models\InventarioLinha;
use App\Models\Produto;
use App\Services\Stock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Inventários: contagem física do armazém e correcção das diferenças. */
class InventarioController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('stock/inventarios/index', [
            'inventarios' => Inventario::with('autor:id,name')->latest('id')->paginate(20)->through(fn (Inventario $i) => [
                'id' => $i->id,
                'data' => $i->data->toDateString(),
                'nota' => $i->nota,
                'produtos_contados' => $i->produtos_contados,
                'diferencas' => $i->diferencas,
                'utilizador' => $i->autor?->name ?? '—',
            ]),
        ]);
    }

    /** Folha de contagem: todos os produtos com a quantidade que o sistema espera */
    public function create(): Response
    {
        return Inertia::render('stock/inventarios/novo', [
            'produtos' => Produto::where('tipo', 'produto')
                ->with('categoria:id,nome,ordem')
                ->get()
                ->sortBy(fn (Produto $p) => [$p->categoria?->ordem ?? PHP_INT_MAX, $p->nome])
                ->values()
                ->map(fn (Produto $p) => [
                    'id' => $p->id,
                    'referencia' => $p->referencia,
                    'nome' => $p->nome,
                    'categoria' => $p->categoria?->nome ?? 'Sem categoria',
                    'total' => $p->quantidade_total,
                    'fora' => $p->quantidade_fora,
                ]),
        ]);
    }

    public function store(Request $request, Stock $stock): RedirectResponse
    {
        $dados = $request->validate([
            'contagens' => ['required', 'array'],
            'contagens.*' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'nota' => ['nullable', 'string', 'max:255'],
        ], [
            'contagens.*.integer' => 'As quantidades contadas são números inteiros.',
            'contagens.*.min' => 'As quantidades contadas não podem ser negativas.',
        ]);

        // Só os produtos com número escrito; os que ficaram em branco não foram contados
        $contagens = collect($dados['contagens'])
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->mapWithKeys(fn ($v, $id) => [(int) $id => (int) $v])
            ->all();

        $inventario = $stock->inventario($contagens, $dados['nota'] ?? null, $request->user());

        return to_route('stock.inventarios.show', $inventario)->with('sucesso', $inventario->diferencas === 0
            ? 'Inventário gravado: as quantidades estavam todas certas.'
            : "Inventário gravado: {$inventario->diferencas} produto(s) corrigido(s).");
    }

    public function show(Inventario $inventario): Response
    {
        $inventario->load(['linhas', 'autor:id,name']);

        return Inertia::render('stock/inventarios/mostrar', [
            'inventario' => [
                'id' => $inventario->id,
                'data' => $inventario->data->toDateString(),
                'nota' => $inventario->nota,
                'produtos_contados' => $inventario->produtos_contados,
                'diferencas' => $inventario->diferencas,
                'utilizador' => $inventario->autor?->name ?? '—',
                'criado_em' => $inventario->created_at?->toIso8601String(),
                'linhas' => $inventario->linhas
                    ->sortByDesc(fn (InventarioLinha $l) => abs($l->diferenca))
                    ->values()
                    ->map(fn (InventarioLinha $l) => $l->only(['id', 'produto_id', 'referencia', 'nome', 'esperado', 'contado', 'diferenca'])),
            ],
        ]);
    }
}
