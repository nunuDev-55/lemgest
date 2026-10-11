<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Produto;
use App\Services\Disponibilidade;
use App\Support\Pesquisa;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Quantas cadeiras Tiffany estão livres de 14 a 16 de Novembro?" */
class DisponibilidadeController extends Controller
{
    public function __invoke(Request $request, Disponibilidade $disponibilidade): Response
    {
        $filtros = $request->validate([
            'de' => ['nullable', 'date', 'after_or_equal:today'],
            'ate' => ['nullable', 'date', 'after_or_equal:de'],
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'categoria' => ['nullable', 'string', 'max:10'],
        ], [
            'de.after_or_equal' => 'O período começa hoje ou depois.',
            'ate.after_or_equal' => 'O fim tem de ser igual ou depois do início.',
        ]);

        $de = CarbonImmutable::parse($filtros['de'] ?? today());
        $ate = CarbonImmutable::parse($filtros['ate'] ?? $de);
        if ($de->diffInDays($ate) >= Disponibilidade::MAXIMO_DIAS) {
            $ate = $de->addDays(Disponibilidade::MAXIMO_DIAS - 1);
        }

        $produtos = Produto::query()
            ->where('tipo', 'produto')
            ->where('em_aluguer', true)
            ->with(['categoria:id,nome,ordem', 'fotoPrincipal'])
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('nome', 'like', Pesquisa::like($t))->orWhere('referencia', 'like', Pesquisa::like($t))))
            ->when($filtros['categoria'] ?? null, fn ($q, $c) => $c === 'sem' ? $q->whereNull('categoria_id') : $q->where('categoria_id', (int) $c))
            ->orderBy('nome')
            ->get();

        $contas = $disponibilidade->noPeriodo($produtos, $de, $ate);

        return Inertia::render('stock/disponibilidade', [
            'periodo' => ['de' => $de->toDateString(), 'ate' => $ate->toDateString(), 'dias' => (int) $de->diffInDays($ate) + 1],
            'filtros' => (object) $filtros,
            'categorias' => Categoria::orderBy('ordem')->get(['id', 'nome'])->map(fn ($c) => ['valor' => (string) $c->id, 'label' => $c->nome]),
            'linhas' => $produtos
                ->sortBy(fn (Produto $p) => [$p->categoria?->ordem ?? PHP_INT_MAX, $p->nome])
                ->values()
                ->map(fn (Produto $p) => [
                    'id' => $p->id,
                    'referencia' => $p->referencia,
                    'nome' => $p->nome,
                    'categoria' => $p->categoria?->nome,
                    'foto' => $p->fotoPrincipal?->url('mini'),
                    ...$contas[$p->id],
                ]),
        ]);
    }
}
