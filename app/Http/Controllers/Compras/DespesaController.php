<?php

namespace App\Http\Controllers\Compras;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarProdutoRequest;
use App\Models\Despesa;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Despesas do dia-a-dia (combustível, salários, renda...). As compras de matéria-prima ficam nas facturas de fornecedores;
 * as duas juntas são os gastos que os Resultados comparam com os ganhos.
 */
class DespesaController extends Controller
{
    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'categoria' => ['nullable', Rule::in(array_keys(Despesa::CATEGORIAS))],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = Despesa::query()
            ->with('autor:id,name')
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where('descricao', 'like', Pesquisa::like($t)))
            ->when($filtros['categoria'] ?? null, fn ($q, $c) => $q->where('categoria', $c))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->whereDate('data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->whereDate('data', '<=', $d));

        $total = Dinheiro::normalizar((clone $query)->reorder()->sum('valor'));
        $ordenacao = Ordenacao::aplicar($query, $request, ['data' => 'data', 'valor' => 'valor', 'categoria' => 'categoria'], 'data', 'desc');
        $query->orderByDesc('id');

        return Inertia::render('despesas/index', [
            'despesas' => $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Despesa $d) => [
                'id' => $d->id,
                'data' => $d->data->toDateString(),
                'categoria' => $d->categoria,
                'categoria_nome' => $d->categoriaNome(),
                'descricao' => $d->descricao,
                'valor' => (string) $d->valor,
                'metodo' => $d->metodo,
                'metodo_nome' => Opcoes::METODOS_PAGAMENTO[$d->metodo] ?? $d->metodo,
                'autor' => $d->autor?->name,
            ]),
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'total' => $total,
            'categorias' => Opcoes::paraSelect(Despesa::CATEGORIAS),
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $despesa = new Despesa($this->validar($request));
        $despesa->criado_por = $request->user('web')->id;
        $despesa->save();

        return back()->with('sucesso', 'Despesa registada.');
    }

    public function update(Request $request, Despesa $despesa): RedirectResponse
    {
        $despesa->update($this->validar($request));

        return back()->with('sucesso', 'Despesa alterada.');
    }

    public function destroy(Despesa $despesa): RedirectResponse
    {
        $despesa->delete();

        return back()->with('sucesso', 'Despesa apagada.');
    }

    /** @return array<string, mixed> */
    private function validar(Request $request): array
    {
        if ($request->filled('valor')) {
            $request->merge(['valor' => GuardarProdutoRequest::numero((string) $request->input('valor'))]);
        }

        return $request->validate([
            'data' => ['required', 'date', 'before_or_equal:today'],
            'categoria' => ['required', Rule::in(array_keys(Despesa::CATEGORIAS))],
            'descricao' => ['required', 'string', 'max:190'],
            'valor' => ['required', 'numeric', 'min:0.01', 'max:9999999999'],
            'metodo' => ['required', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
        ], ['data.before_or_equal' => 'Uma despesa regista-se depois de paga: a data não pode ser futura.'], [
            'descricao' => 'descrição',
            'metodo' => 'forma de pagamento',
        ]);
    }
}
