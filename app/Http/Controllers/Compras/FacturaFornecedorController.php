<?php

namespace App\Http\Controllers\Compras;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Compras\GuardarDocumentoCompraRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\FacturaFornecedor;
use App\Models\FacturaFornecedorLinha;
use App\Services\FacturaFornecedorService;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FacturaFornecedorController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly FacturaFornecedorService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:rascunho,validada,paga,abandonada,vencidas'],
            'ref' => ['nullable', 'string', 'max:30'],
            'ref_fornecedor' => ['nullable', 'string', 'max:60'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = FacturaFornecedor::query()
            ->join('terceiros', 'terceiros.id', '=', 'facturas_fornecedor.terceiro_id')
            ->select('facturas_fornecedor.*', 'terceiros.nome as fornecedor_nome')
            ->when($filtros['estado'] ?? null, fn ($q, $e) => $e === 'vencidas'
                ? $q->where('facturas_fornecedor.estado', FacturaFornecedor::VALIDADA)->where('facturas_fornecedor.data_vencimento', '<', now()->toDateString())
                : $q->where('facturas_fornecedor.estado', $e))
            ->when($filtros['ref'] ?? null, fn ($q, $t) => $q->where('facturas_fornecedor.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['ref_fornecedor'] ?? null, fn ($q, $t) => $q->where('facturas_fornecedor.ref_fornecedor', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('facturas_fornecedor.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('facturas_fornecedor.data', '<=', $d));

        $totais = (clone $query)->reorder()->select([])->selectRaw(
            'COALESCE(SUM(facturas_fornecedor.total_sem_iva),0) as sem_iva, COALESCE(SUM(facturas_fornecedor.total),0) as total, '
            ."COALESCE(SUM(CASE WHEN facturas_fornecedor.estado = 'validada' THEN facturas_fornecedor.total - facturas_fornecedor.total_pago ELSE 0 END),0) as por_pagar"
        )->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'facturas_fornecedor.numero', 'ref_fornecedor' => 'facturas_fornecedor.ref_fornecedor', 'data' => 'facturas_fornecedor.data',
            'vencimento' => 'facturas_fornecedor.data_vencimento', 'cliente' => 'terceiros.nome', 'total' => 'facturas_fornecedor.total',
            'estado' => 'facturas_fornecedor.estado',
        ], 'data', 'desc');
        $query->orderByDesc('facturas_fornecedor.id');

        $facturas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (FacturaFornecedor $f) => [
            'id' => $f->id,
            'referencia' => $f->referencia(),
            'ref_fornecedor' => $f->ref_fornecedor,
            'data' => $f->data->toDateString(),
            'data_vencimento' => $f->data_vencimento?->toDateString(),
            'fornecedor' => $f->fornecedor_nome,
            'terceiro_id' => $f->terceiro_id,
            'total_sem_iva' => (string) $f->total_sem_iva,
            'total' => (string) $f->total,
            'estado' => $f->estado,
            'vencida' => $f->estaVencida(),
            'parcial' => $f->estado === FacturaFornecedor::VALIDADA && bccomp((string) $f->total_pago, '0', 2) > 0,
        ]);

        return Inertia::render('facturas-fornecedor/index', [
            'facturas' => $facturas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => [
                'sem_iva' => Dinheiro::normalizar($totais->sem_iva),
                'total' => Dinheiro::normalizar($totais->total),
                'por_pagar' => Dinheiro::normalizar($totais->por_pagar),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('facturas-fornecedor/formulario', [
            'documento' => null,
            'fornecedores' => $this->fornecedoresParaSelect(),
            'fornecedorId' => $request->integer('terceiro') ?: null,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarDocumentoCompraRequest $request): RedirectResponse
    {
        $f = $this->service->criar($request->validated(), $request->user());

        return to_route('facturas-fornecedor.show', $f)->with('sucesso', 'Rascunho lançado. Acrescente as linhas tal como estão na factura do fornecedor.');
    }

    public function show(FacturaFornecedor $facturaFornecedor): Response
    {
        $f = $facturaFornecedor->load(['terceiro', 'linhas', 'pagamentos', 'validadaPor:id,name', 'encomenda']);

        return Inertia::render('facturas-fornecedor/mostrar', [
            'factura' => [
                'id' => $f->id,
                'referencia' => $f->referencia(),
                'numero' => $f->numero,
                'ref_fornecedor' => $f->ref_fornecedor,
                'estado' => $f->estado,
                'vencida' => $f->estaVencida(),
                'data' => $f->data->toDateString(),
                'data_vencimento' => $f->data_vencimento?->toDateString(),
                'termos_pagamento_nome' => Opcoes::TERMOS_PAGAMENTO[$f->termos_pagamento][0] ?? $f->termos_pagamento,
                'metodo_pagamento_nome' => Opcoes::METODOS_PAGAMENTO[$f->metodo_pagamento] ?? null,
                'nota_privada' => $f->nota_privada,
                'motivo_abandono' => $f->motivo_abandono,
                'total_sem_iva' => (string) $f->total_sem_iva,
                'total_iva' => (string) $f->total_iva,
                'total' => (string) $f->total,
                'total_pago' => (string) $f->total_pago,
                'em_falta' => $f->emFalta(),
                'validada_em' => $f->validada_em?->toIso8601String(),
                'validada_por' => $f->validadaPor?->name,
                'terceiro' => $this->fornecedorResumo($f->terceiro),
                'linhas' => $f->linhas->map->paraEcra()->values(),
                'pagamentos' => $f->pagamentos->map(fn ($p) => [
                    'id' => $p->id,
                    'numero' => $p->numero,
                    'data' => $p->data->toDateString(),
                    'metodo' => $p->metodoNome(),
                    'numero_documento' => $p->numero_documento,
                    'valor' => (string) $p->pivot->valor,
                ])->values(),
            ],
            'relacionados' => $this->relacionados('encomenda_fornecedor', [$f->encomenda]),
            'produtos' => $f->eRascunho() ? $this->produtosEmCompra() : [],
            'eventos' => $this->eventos($f),
        ]);
    }

    public function edit(FacturaFornecedor $facturaFornecedor): Response|RedirectResponse
    {
        $f = $facturaFornecedor;
        if (! $f->eRascunho()) {
            return to_route('facturas-fornecedor.show', $f)->with('erro', 'Só uma factura em rascunho pode ser modificada.');
        }

        return Inertia::render('facturas-fornecedor/formulario', [
            'documento' => [
                ...$f->only(['id', 'terceiro_id', 'ref_fornecedor', 'termos_pagamento', 'metodo_pagamento', 'nota_privada']),
                'referencia' => $f->referencia(),
                'data' => $f->data->toDateString(),
            ],
            'fornecedores' => $this->fornecedoresParaSelect(),
            'fornecedorId' => $f->terceiro_id,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function update(GuardarDocumentoCompraRequest $request, FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $this->service->actualizarCabecalho($facturaFornecedor, $request->validated());

        return to_route('facturas-fornecedor.show', $facturaFornecedor)->with('sucesso', 'Factura alterada.');
    }

    public function destroy(FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $ref = $facturaFornecedor->referencia();
        $this->service->apagar($facturaFornecedor);

        return to_route('facturas-fornecedor.index')->with('sucesso', "Rascunho {$ref} apagado.");
    }

    public function validar(Request $request, FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $f = $this->service->validar($facturaFornecedor, $request->user());

        return back()->with('sucesso', "Factura de fornecedor validada com o número interno {$f->numero}.");
    }

    public function abandonar(Request $request, FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:255']], [], ['motivo' => 'motivo']);
        $this->service->abandonar($facturaFornecedor, $dados['motivo']);

        return back()->with('sucesso', 'Factura classificada como abandonada.');
    }

    public function reabrir(FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $this->service->reabrir($facturaFornecedor);

        return back()->with('sucesso', 'Factura reaberta.');
    }

    public function adicionarLinha(GuardarLinhaRequest $request, FacturaFornecedor $facturaFornecedor): RedirectResponse
    {
        $this->service->adicionarLinha($facturaFornecedor, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, FacturaFornecedor $facturaFornecedor, FacturaFornecedorLinha $linha): RedirectResponse
    {
        abort_unless($linha->factura_fornecedor_id === $facturaFornecedor->id, 404);
        $this->service->actualizarLinha($facturaFornecedor, $linha, $request->validated());

        return back();
    }

    public function removerLinha(FacturaFornecedor $facturaFornecedor, FacturaFornecedorLinha $linha): RedirectResponse
    {
        abort_unless($linha->factura_fornecedor_id === $facturaFornecedor->id, 404);
        $this->service->removerLinha($facturaFornecedor, $linha);

        return back();
    }
}
