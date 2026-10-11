<?php

namespace App\Http\Controllers\Facturacao;

use App\Http\Controllers\Controller;
use App\Http\Requests\Facturacao\RegistarPagamentoRequest;
use App\Models\Factura;
use App\Models\Pagamento;
use App\Services\FacturaService;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PagamentoController extends Controller
{
    public function __construct(private readonly FacturaService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'numero' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'metodo' => ['nullable', 'in:'.implode(',', array_keys(Opcoes::METODOS_PAGAMENTO))],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = Pagamento::query()
            ->join('terceiros', 'terceiros.id', '=', 'pagamentos.terceiro_id')
            ->select('pagamentos.*', 'terceiros.nome as cliente_nome')
            ->with('facturas:id,numero')
            ->when($filtros['numero'] ?? null, fn ($q, $t) => $q->where('pagamentos.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['metodo'] ?? null, fn ($q, $m) => $q->where('pagamentos.metodo', $m))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('pagamentos.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('pagamentos.data', '<=', $d));

        $total = Dinheiro::normalizar((clone $query)->reorder()->sum('pagamentos.valor'));

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'numero' => 'pagamentos.numero', 'data' => 'pagamentos.data', 'cliente' => 'terceiros.nome', 'valor' => 'pagamentos.valor',
        ], 'data', 'desc');
        $query->orderByDesc('pagamentos.id');

        $pagamentos = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Pagamento $p) => [
            'id' => $p->id,
            'numero' => $p->numero,
            'data' => $p->data->toDateString(),
            'cliente' => $p->cliente_nome,
            'terceiro_id' => $p->terceiro_id,
            'metodo' => $p->metodoNome(),
            'numero_documento' => $p->numero_documento,
            'valor' => (string) $p->valor,
            'facturas' => $p->facturas->map(fn ($f) => ['id' => $f->id, 'numero' => $f->numero])->values(),
        ]);

        return Inertia::render('pagamentos/index', [
            'pagamentos' => $pagamentos,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'total' => $total,
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function create(Factura $factura): Response|RedirectResponse
    {
        if ($factura->estado !== Factura::VALIDADA) {
            return to_route('facturas.show', $factura)->with('erro', 'Só se registam pagamentos em facturas pendentes de cobrança.');
        }

        $factura->load('terceiro:id,nome');

        return Inertia::render('pagamentos/criar', [
            'factura' => [
                'id' => $factura->id,
                'referencia' => $factura->referencia(),
                'data' => $factura->data->toDateString(),
                'data_vencimento' => $factura->data_vencimento?->toDateString(),
                'total' => (string) $factura->total,
                'total_pago' => (string) $factura->total_pago,
                'em_falta' => $factura->emFalta(),
                'metodo_pagamento' => $factura->metodo_pagamento,
                'cliente' => $factura->terceiro->nome,
            ],
            'hoje' => now()->toDateString(),
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function store(RegistarPagamentoRequest $request, Factura $factura): RedirectResponse
    {
        $pagamento = $this->service->registarPagamento($factura, $request->validated(), $request->user());

        return to_route('facturas.show', $factura)->with('sucesso', "Pagamento {$pagamento->numero} registado.");
    }
}
