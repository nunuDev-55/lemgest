<?php

namespace App\Http\Controllers\Compras;

use App\Http\Controllers\Controller;
use App\Http\Requests\Facturacao\RegistarPagamentoRequest;
use App\Models\FacturaFornecedor;
use App\Models\PagamentoFornecedor;
use App\Services\FacturaFornecedorService;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PagamentoFornecedorController extends Controller
{
    public function __construct(private readonly FacturaFornecedorService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'numero' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'metodo' => ['nullable', 'in:'.implode(',', array_keys(Opcoes::METODOS_PAGAMENTO))],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = PagamentoFornecedor::query()
            ->join('terceiros', 'terceiros.id', '=', 'pagamentos_fornecedor.terceiro_id')
            ->select('pagamentos_fornecedor.*', 'terceiros.nome as fornecedor_nome')
            ->with('facturas:id,numero,ref_fornecedor')
            ->when($filtros['numero'] ?? null, fn ($q, $t) => $q->where('pagamentos_fornecedor.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['metodo'] ?? null, fn ($q, $m) => $q->where('pagamentos_fornecedor.metodo', $m))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('pagamentos_fornecedor.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('pagamentos_fornecedor.data', '<=', $d));

        $total = Dinheiro::normalizar((clone $query)->reorder()->sum('pagamentos_fornecedor.valor'));

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'numero' => 'pagamentos_fornecedor.numero', 'data' => 'pagamentos_fornecedor.data',
            'cliente' => 'terceiros.nome', 'valor' => 'pagamentos_fornecedor.valor',
        ], 'data', 'desc');
        $query->orderByDesc('pagamentos_fornecedor.id');

        $pagamentos = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (PagamentoFornecedor $p) => [
            'id' => $p->id,
            'numero' => $p->numero,
            'data' => $p->data->toDateString(),
            'fornecedor' => $p->fornecedor_nome,
            'terceiro_id' => $p->terceiro_id,
            'metodo' => $p->metodoNome(),
            'numero_documento' => $p->numero_documento,
            'valor' => (string) $p->valor,
            'facturas' => $p->facturas->map(fn ($f) => ['id' => $f->id, 'numero' => $f->numero, 'ref_fornecedor' => $f->ref_fornecedor])->values(),
        ]);

        return Inertia::render('pagamentos-fornecedor/index', [
            'pagamentos' => $pagamentos,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'total' => $total,
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function create(FacturaFornecedor $facturaFornecedor): Response|RedirectResponse
    {
        $f = $facturaFornecedor;
        if ($f->estado !== FacturaFornecedor::VALIDADA) {
            return to_route('facturas-fornecedor.show', $f)->with('erro', 'Só se registam pagamentos em facturas de fornecedor por pagar.');
        }
        $f->load('terceiro:id,nome');

        return Inertia::render('pagamentos-fornecedor/criar', [
            'factura' => [
                'id' => $f->id,
                'referencia' => $f->referencia(),
                'ref_fornecedor' => $f->ref_fornecedor,
                'data' => $f->data->toDateString(),
                'data_vencimento' => $f->data_vencimento?->toDateString(),
                'total' => (string) $f->total,
                'total_pago' => (string) $f->total_pago,
                'em_falta' => $f->emFalta(),
                'metodo_pagamento' => $f->metodo_pagamento,
                'fornecedor' => $f->terceiro->nome,
            ],
            'hoje' => now()->toDateString(),
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function store(RegistarPagamentoRequest $request, FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $p = $this->service->registarPagamento($facturaFornecedor, $request->validated(), $request->user());

        return to_route('facturas-fornecedor.show', $facturaFornecedor)->with('sucesso', "Pagamento {$p->numero} registado.");
    }
}
