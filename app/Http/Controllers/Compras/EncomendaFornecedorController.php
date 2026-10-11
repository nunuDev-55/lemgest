<?php

namespace App\Http\Controllers\Compras;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Compras\GuardarDocumentoCompraRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\EncomendaFornecedor;
use App\Models\EncomendaFornecedorLinha;
use App\Services\EncomendaFornecedorService;
use App\Support\Definicoes;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EncomendaFornecedorController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly EncomendaFornecedorService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:rascunho,validada,encomendada,recebida,anulada,por_facturar,atrasadas'],
            'ref' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = EncomendaFornecedor::query()
            ->join('terceiros', 'terceiros.id', '=', 'encomendas_fornecedor.terceiro_id')
            ->select('encomendas_fornecedor.*', 'terceiros.nome as fornecedor_nome')
            ->when($filtros['estado'] ?? null, fn ($q, $e) => match ($e) {
                'por_facturar' => $q->whereIn('encomendas_fornecedor.estado', [EncomendaFornecedor::ENCOMENDADA, EncomendaFornecedor::RECEBIDA])->where('encomendas_fornecedor.facturada', false),
                'atrasadas' => $q->where('encomendas_fornecedor.estado', EncomendaFornecedor::ENCOMENDADA)->where('encomendas_fornecedor.data_entrega', '<', now()->toDateString()),
                default => $q->where('encomendas_fornecedor.estado', $e),
            })
            ->when($filtros['ref'] ?? null, fn ($q, $t) => $q->where('encomendas_fornecedor.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('encomendas_fornecedor.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('encomendas_fornecedor.data', '<=', $d));

        $totais = (clone $query)->reorder()->select([])
            ->selectRaw('COALESCE(SUM(encomendas_fornecedor.total_sem_iva),0) as sem_iva, COALESCE(SUM(encomendas_fornecedor.total),0) as total')->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'encomendas_fornecedor.numero', 'data' => 'encomendas_fornecedor.data', 'entrega' => 'encomendas_fornecedor.data_entrega',
            'cliente' => 'terceiros.nome', 'total' => 'encomendas_fornecedor.total', 'estado' => 'encomendas_fornecedor.estado',
        ], 'data', 'desc');
        $query->orderByDesc('encomendas_fornecedor.id');

        $encomendas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (EncomendaFornecedor $e) => [
            'id' => $e->id,
            'referencia' => $e->referencia(),
            'data' => $e->data->toDateString(),
            'data_entrega' => $e->data_entrega?->toDateString(),
            'cliente' => $e->fornecedor_nome,
            'terceiro_id' => $e->terceiro_id,
            'total_sem_iva' => (string) $e->total_sem_iva,
            'total' => (string) $e->total,
            'estado' => $e->estado,
            'facturada' => $e->facturada,
            'atrasada' => $e->atrasada(),
        ]);

        return Inertia::render('encomendas-fornecedor/index', [
            'encomendas' => $encomendas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => ['sem_iva' => Dinheiro::normalizar($totais->sem_iva), 'total' => Dinheiro::normalizar($totais->total)],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('encomendas-fornecedor/formulario', [
            'documento' => null,
            'fornecedores' => $this->fornecedoresParaSelect(),
            'fornecedorId' => $request->integer('terceiro') ?: null,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarDocumentoCompraRequest $request): RedirectResponse
    {
        $e = $this->service->criar($request->validated(), $request->user());

        return to_route('encomendas-fornecedor.show', $e)->with('sucesso', 'Rascunho de encomenda criado. Acrescente agora o que vai encomendar.');
    }

    public function show(EncomendaFornecedor $encomendaFornecedor): Response
    {
        $e = $encomendaFornecedor->load(['terceiro', 'linhas', 'validadaPor:id,name', 'facturas']);

        return Inertia::render('encomendas-fornecedor/mostrar', [
            'documento' => $this->paraFicha($e),
            'relacionados' => $this->relacionados('factura_fornecedor', $e->facturas),
            'produtos' => $e->eRascunho() ? $this->produtosEmCompra() : [],
            'eventos' => $this->eventos($e),
            'meios' => collect(EncomendaFornecedor::MEIOS)->map(fn ($label, $valor) => ['valor' => $valor, 'label' => $label])->values(),
        ]);
    }

    public function edit(EncomendaFornecedor $encomendaFornecedor): Response|RedirectResponse
    {
        $e = $encomendaFornecedor;
        if (! $e->eRascunho()) {
            return to_route('encomendas-fornecedor.show', $e)->with('erro', 'Só uma encomenda em rascunho pode ser modificada.');
        }

        return Inertia::render('encomendas-fornecedor/formulario', [
            'documento' => [
                ...$e->only(['id', 'terceiro_id', 'termos_pagamento', 'metodo_pagamento', 'ref_fornecedor', 'nota_publica', 'nota_privada']),
                'referencia' => $e->referencia(),
                'data' => $e->data->toDateString(),
                'data_entrega' => $e->data_entrega?->toDateString(),
            ],
            'fornecedores' => $this->fornecedoresParaSelect(),
            'fornecedorId' => $e->terceiro_id,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function update(GuardarDocumentoCompraRequest $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->actualizarCabecalho($encomendaFornecedor, $request->validated());

        return to_route('encomendas-fornecedor.show', $encomendaFornecedor)->with('sucesso', 'Encomenda alterada.');
    }

    public function destroy(EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $ref = $encomendaFornecedor->referencia();
        $this->service->apagar($encomendaFornecedor);

        return to_route('encomendas-fornecedor.index')->with('sucesso', "Rascunho {$ref} apagado.");
    }

    public function validar(Request $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $e = $this->service->validar($encomendaFornecedor, $request->user());

        return back()->with('sucesso', "Encomenda validada com o número {$e->numero}. Envie-a ao fornecedor e registe em \"Encomendar\".");
    }

    public function voltarARascunho(EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->voltarARascunho($encomendaFornecedor);

        return back()->with('sucesso', 'A encomenda voltou a rascunho e pode ser alterada.');
    }

    public function encomendar(Request $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $dados = $request->validate([
            'data' => ['required', 'date', 'before_or_equal:today'],
            'meio' => ['required', Rule::in(array_keys(EncomendaFornecedor::MEIOS))],
        ], [], ['meio' => 'meio']);
        $this->service->encomendar($encomendaFornecedor, $dados['data'], $dados['meio']);

        return back()->with('sucesso', 'Encomenda registada como enviada ao fornecedor.');
    }

    public function receber(Request $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $pecas = $this->service->receber($encomendaFornecedor, $request->user());

        return back()->with('sucesso', 'Encomenda classificada como recebida.'.($pecas > 0 ? " Entraram {$pecas} peça(s) em stock." : ''));
    }

    public function anular(EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->anular($encomendaFornecedor);

        return back()->with('sucesso', 'Encomenda anulada.');
    }

    public function reabrir(EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->reabrir($encomendaFornecedor, request()->user());

        return back()->with('sucesso', 'Encomenda reaberta.');
    }

    public function classificarFacturada(EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->classificarFacturada($encomendaFornecedor);

        return back()->with('sucesso', 'Encomenda classificada como facturada.');
    }

    public function criarFactura(Request $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $dados = $request->validate([
            'ref_fornecedor' => [
                'required', 'string', 'max:60',
                Rule::unique('facturas_fornecedor', 'ref_fornecedor')->where('terceiro_id', $encomendaFornecedor->terceiro_id),
            ],
        ], ['ref_fornecedor.unique' => 'Esta factura deste fornecedor já foi lançada.'], ['ref_fornecedor' => 'nº da factura do fornecedor']);

        $f = $this->service->criarFactura($encomendaFornecedor, $dados['ref_fornecedor'], $request->user());

        return to_route('facturas-fornecedor.show', $f)->with('sucesso', "Factura de fornecedor criada a partir da encomenda {$encomendaFornecedor->numero}. Confira com o documento do fornecedor e valide.");
    }

    public function imprimir(EncomendaFornecedor $encomendaFornecedor): Response
    {
        $encomendaFornecedor->load(['terceiro', 'linhas']);

        return Inertia::render('encomendas-fornecedor/imprimir', [
            'documento' => $this->paraFicha($encomendaFornecedor),
            'empresa' => app(Definicoes::class)->empresa(),
        ]);
    }

    public function adicionarLinha(GuardarLinhaRequest $request, EncomendaFornecedor $encomendaFornecedor): RedirectResponse
    {
        $this->service->adicionarLinha($encomendaFornecedor, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, EncomendaFornecedor $encomendaFornecedor, EncomendaFornecedorLinha $linha): RedirectResponse
    {
        abort_unless($linha->encomenda_fornecedor_id === $encomendaFornecedor->id, 404);
        $this->service->actualizarLinha($encomendaFornecedor, $linha, $request->validated());

        return back();
    }

    public function removerLinha(EncomendaFornecedor $encomendaFornecedor, EncomendaFornecedorLinha $linha): RedirectResponse
    {
        abort_unless($linha->encomenda_fornecedor_id === $encomendaFornecedor->id, 404);
        $this->service->removerLinha($encomendaFornecedor, $linha);

        return back();
    }

    /** @return array<string, mixed> */
    private function paraFicha(EncomendaFornecedor $e): array
    {
        return [
            'id' => $e->id,
            'referencia' => $e->referencia(),
            'numero' => $e->numero,
            'estado' => $e->estado,
            'facturada' => $e->facturada,
            'atrasada' => $e->atrasada(),
            'data' => $e->data->toDateString(),
            'data_entrega' => $e->data_entrega?->toDateString(),
            'termos_pagamento_nome' => Opcoes::TERMOS_PAGAMENTO[$e->termos_pagamento][0] ?? $e->termos_pagamento,
            'metodo_pagamento_nome' => Opcoes::METODOS_PAGAMENTO[$e->metodo_pagamento] ?? null,
            'ref_fornecedor' => $e->ref_fornecedor,
            'nota_publica' => $e->nota_publica,
            'nota_privada' => $e->nota_privada,
            'total_sem_iva' => (string) $e->total_sem_iva,
            'total_iva' => (string) $e->total_iva,
            'total' => (string) $e->total,
            'validada_em' => $e->validada_em?->toIso8601String(),
            'validada_por' => $e->validadaPor?->name,
            'encomendada_em' => $e->encomendada_em?->toDateString(),
            'meio_encomenda' => $e->meio_encomenda ? (EncomendaFornecedor::MEIOS[$e->meio_encomenda] ?? $e->meio_encomenda) : null,
            'recebida_em' => $e->recebida_em?->toIso8601String(),
            'terceiro' => $this->fornecedorResumo($e->terceiro),
            'linhas' => $e->linhas->map->paraEcra()->values(),
        ];
    }
}
