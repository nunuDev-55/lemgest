<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarDocumentoComercialRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\Encomenda;
use App\Models\EncomendaLinha;
use App\Services\EncomendaService;
use App\Support\Definicoes;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EncomendaController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly EncomendaService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:rascunho,validada,entregue,anulada,por_facturar,atrasadas'],
            'ref' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = Encomenda::query()
            ->join('terceiros', 'terceiros.id', '=', 'encomendas.terceiro_id')
            ->select('encomendas.*', 'terceiros.nome as cliente_nome')
            ->when($filtros['estado'] ?? null, fn ($q, $e) => match ($e) {
                'por_facturar' => $q->whereIn('encomendas.estado', [Encomenda::VALIDADA, Encomenda::ENTREGUE])->where('encomendas.facturada', false),
                'atrasadas' => $q->where('encomendas.estado', Encomenda::VALIDADA)->where('encomendas.data_entrega', '<', now()->toDateString()),
                default => $q->where('encomendas.estado', $e),
            })
            ->when($filtros['ref'] ?? null, fn ($q, $t) => $q->where('encomendas.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('encomendas.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('encomendas.data', '<=', $d));

        $totais = (clone $query)->reorder()->select([])->selectRaw('COALESCE(SUM(encomendas.total_sem_iva),0) as sem_iva, COALESCE(SUM(encomendas.total),0) as total')->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'encomendas.numero', 'data' => 'encomendas.data', 'entrega' => 'encomendas.data_entrega',
            'cliente' => 'terceiros.nome', 'total' => 'encomendas.total', 'estado' => 'encomendas.estado',
        ], 'data', 'desc');
        $query->orderByDesc('encomendas.id');

        $encomendas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Encomenda $e) => [
            'id' => $e->id,
            'referencia' => $e->referencia(),
            'data' => $e->data->toDateString(),
            'data_entrega' => $e->data_entrega?->toDateString(),
            'cliente' => $e->cliente_nome,
            'terceiro_id' => $e->terceiro_id,
            'total_sem_iva' => (string) $e->total_sem_iva,
            'total' => (string) $e->total,
            'estado' => $e->estado,
            'facturada' => $e->facturada,
            'atrasada' => $e->atrasada(),
        ]);

        return Inertia::render('encomendas/index', [
            'encomendas' => $encomendas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => ['sem_iva' => Dinheiro::normalizar($totais->sem_iva), 'total' => Dinheiro::normalizar($totais->total)],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('encomendas/formulario', [
            'documento' => null,
            'clientes' => $this->clientesParaSelect(),
            'clienteId' => $request->integer('terceiro') ?: null,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarDocumentoComercialRequest $request): RedirectResponse
    {
        $e = $this->service->criar($request->validated(), $request->user());

        return to_route('encomendas.show', $e)->with('sucesso', 'Rascunho de encomenda criado. Acrescente agora as linhas.');
    }

    public function show(Encomenda $encomenda): Response
    {
        $encomenda->load(['terceiro', 'linhas', 'validadaPor:id,name', 'orcamento', 'facturas']);

        return Inertia::render('encomendas/mostrar', [
            'documento' => [
                ...$this->cabecalho($encomenda),
                'facturada' => $encomenda->facturada,
                'atrasada' => $encomenda->atrasada(),
                'entregue_em' => $encomenda->entregue_em?->toIso8601String(),
                'validada_em' => $encomenda->validada_em?->toIso8601String(),
                'validada_por' => $encomenda->validadaPor?->name,
            ],
            'relacionados' => [
                ...$this->relacionados('orcamento', [$encomenda->orcamento]),
                ...$this->relacionados('factura', $encomenda->facturas),
            ],
            'produtos' => $encomenda->eRascunho() ? $this->produtosEmVenda() : [],
            'eventos' => $this->eventos($encomenda),
        ]);
    }

    public function edit(Encomenda $encomenda): Response|RedirectResponse
    {
        if (! $encomenda->eRascunho()) {
            return to_route('encomendas.show', $encomenda)->with('erro', 'Só uma encomenda em rascunho pode ser modificada.');
        }

        return Inertia::render('encomendas/formulario', [
            'documento' => [
                ...$encomenda->only(['id', 'terceiro_id', 'termos_pagamento', 'metodo_pagamento', 'ref_cliente', 'nota_publica', 'nota_privada']),
                'referencia' => $encomenda->referencia(),
                'data' => $encomenda->data->toDateString(),
                'data_entrega' => $encomenda->data_entrega?->toDateString(),
            ],
            'clientes' => $this->clientesParaSelect(),
            'clienteId' => $encomenda->terceiro_id,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function update(GuardarDocumentoComercialRequest $request, Encomenda $encomenda): RedirectResponse
    {
        $this->service->actualizarCabecalho($encomenda, $request->validated());

        return to_route('encomendas.show', $encomenda)->with('sucesso', 'Encomenda alterada.');
    }

    public function destroy(Encomenda $encomenda): RedirectResponse
    {
        $ref = $encomenda->referencia();
        $this->service->apagar($encomenda);

        return to_route('encomendas.index')->with('sucesso', "Rascunho {$ref} apagado.");
    }

    public function validar(Request $request, Encomenda $encomenda): RedirectResponse
    {
        $e = $this->service->validar($encomenda, $request->user());

        return back()->with('sucesso', "Encomenda validada com o número {$e->numero}.");
    }

    public function voltarARascunho(Encomenda $encomenda): RedirectResponse
    {
        $this->service->voltarARascunho($encomenda);

        return back()->with('sucesso', 'A encomenda voltou a rascunho e pode ser alterada.');
    }

    public function entregar(Encomenda $encomenda): RedirectResponse
    {
        $this->service->entregar($encomenda);

        return back()->with('sucesso', 'Encomenda classificada como entregue.');
    }

    public function anular(Encomenda $encomenda): RedirectResponse
    {
        $this->service->anular($encomenda);

        return back()->with('sucesso', 'Encomenda anulada.');
    }

    public function reabrir(Encomenda $encomenda): RedirectResponse
    {
        $this->service->reabrir($encomenda);

        return back()->with('sucesso', 'Encomenda reaberta.');
    }

    public function classificarFacturada(Encomenda $encomenda): RedirectResponse
    {
        $this->service->classificarFacturada($encomenda);

        return back()->with('sucesso', 'Encomenda classificada como facturada.');
    }

    public function criarFactura(Request $request, Encomenda $encomenda): RedirectResponse
    {
        $f = $this->service->criarFactura($encomenda, $request->user());

        return to_route('facturas.show', $f)->with('sucesso', "Factura criada a partir da encomenda {$encomenda->numero}. Reveja e valide.");
    }

    public function imprimir(Encomenda $encomenda): Response
    {
        $encomenda->load(['terceiro', 'linhas']);

        return Inertia::render('documentos/imprimir', [
            'tipo' => 'encomenda',
            'documento' => $this->cabecalho($encomenda),
            'empresa' => app(Definicoes::class)->empresa(),
            'rodape' => app(Definicoes::class)->rodape('encomenda'),
        ]);
    }

    public function adicionarLinha(GuardarLinhaRequest $request, Encomenda $encomenda): RedirectResponse
    {
        $this->service->adicionarLinha($encomenda, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, Encomenda $encomenda, EncomendaLinha $linha): RedirectResponse
    {
        abort_unless($linha->encomenda_id === $encomenda->id, 404);
        $this->service->actualizarLinha($encomenda, $linha, $request->validated());

        return back();
    }

    public function removerLinha(Encomenda $encomenda, EncomendaLinha $linha): RedirectResponse
    {
        abort_unless($linha->encomenda_id === $encomenda->id, 404);
        $this->service->removerLinha($encomenda, $linha);

        return back();
    }
}
