<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarDocumentoComercialRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\Orcamento;
use App\Models\OrcamentoLinha;
use App\Services\OrcamentoService;
use App\Support\Definicoes;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrcamentoController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly OrcamentoService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:rascunho,aberto,assinado,recusado,facturado,expirados'],
            'ref' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = Orcamento::query()
            ->join('terceiros', 'terceiros.id', '=', 'orcamentos.terceiro_id')
            ->select('orcamentos.*', 'terceiros.nome as cliente_nome')
            ->when($filtros['estado'] ?? null, fn ($q, $e) => $e === 'expirados'
                ? $q->where('orcamentos.estado', Orcamento::ABERTO)->where('orcamentos.data_fim_validade', '<', now()->toDateString())
                : $q->where('orcamentos.estado', $e))
            ->when($filtros['ref'] ?? null, fn ($q, $t) => $q->where('orcamentos.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('orcamentos.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('orcamentos.data', '<=', $d));

        $totais = (clone $query)->reorder()->select([])->selectRaw('COALESCE(SUM(orcamentos.total_sem_iva),0) as sem_iva, COALESCE(SUM(orcamentos.total),0) as total')->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'orcamentos.numero', 'data' => 'orcamentos.data', 'validade' => 'orcamentos.data_fim_validade',
            'cliente' => 'terceiros.nome', 'total' => 'orcamentos.total', 'estado' => 'orcamentos.estado',
        ], 'data', 'desc');
        $query->orderByDesc('orcamentos.id');

        $orcamentos = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Orcamento $o) => [
            'id' => $o->id,
            'referencia' => $o->referencia(),
            'data' => $o->data->toDateString(),
            'data_fim_validade' => $o->data_fim_validade?->toDateString(),
            'cliente' => $o->cliente_nome,
            'terceiro_id' => $o->terceiro_id,
            'total_sem_iva' => (string) $o->total_sem_iva,
            'total' => (string) $o->total,
            'estado' => $o->estado,
            'expirado' => $o->expirado(),
        ]);

        return Inertia::render('orcamentos/index', [
            'orcamentos' => $orcamentos,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => ['sem_iva' => Dinheiro::normalizar($totais->sem_iva), 'total' => Dinheiro::normalizar($totais->total)],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('orcamentos/formulario', [
            'documento' => null,
            'clientes' => $this->clientesParaSelect(comPotenciais: true),
            'clienteId' => $request->integer('terceiro') ?: null,
            'hoje' => now()->toDateString(),
            'validadeOmissao' => app(Definicoes::class)->validadeOrcamento(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarDocumentoComercialRequest $request): RedirectResponse
    {
        $o = $this->service->criar($request->validated(), $request->user());

        return to_route('orcamentos.show', $o)->with('sucesso', 'Rascunho de orçamento criado. Acrescente agora as linhas.');
    }

    public function show(Orcamento $orcamento): Response
    {
        $orcamento->load(['terceiro', 'linhas', 'validadoPor:id,name', 'encomendas', 'facturas']);

        return Inertia::render('orcamentos/mostrar', [
            'documento' => [
                ...$this->cabecalho($orcamento),
                'validade_dias' => $orcamento->validade_dias,
                'data_fim_validade' => $orcamento->data_fim_validade?->toDateString(),
                'expirado' => $orcamento->expirado(),
                'nota_fecho' => $orcamento->nota_fecho,
                'validado_em' => $orcamento->validado_em?->toIso8601String(),
                'validado_por' => $orcamento->validadoPor?->name,
            ],
            'relacionados' => [
                ...$this->relacionados('encomenda', $orcamento->encomendas),
                ...$this->relacionados('factura', $orcamento->facturas),
            ],
            'produtos' => $orcamento->eRascunho() ? $this->produtosEmVenda() : [],
            'eventos' => $this->eventos($orcamento),
        ]);
    }

    public function edit(Orcamento $orcamento): Response|RedirectResponse
    {
        if (! $orcamento->eRascunho()) {
            return to_route('orcamentos.show', $orcamento)->with('erro', 'Só um orçamento em rascunho pode ser modificado.');
        }

        return Inertia::render('orcamentos/formulario', [
            'documento' => [
                ...$orcamento->only(['id', 'terceiro_id', 'validade_dias', 'termos_pagamento', 'metodo_pagamento', 'ref_cliente', 'nota_publica', 'nota_privada']),
                'referencia' => $orcamento->referencia(),
                'data' => $orcamento->data->toDateString(),
                'data_entrega' => $orcamento->data_entrega?->toDateString(),
            ],
            'clientes' => $this->clientesParaSelect(comPotenciais: true),
            'clienteId' => $orcamento->terceiro_id,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function update(GuardarDocumentoComercialRequest $request, Orcamento $orcamento): RedirectResponse
    {
        $this->service->actualizarCabecalho($orcamento, $request->validated());

        return to_route('orcamentos.show', $orcamento)->with('sucesso', 'Orçamento alterado.');
    }

    public function destroy(Orcamento $orcamento): RedirectResponse
    {
        $ref = $orcamento->referencia();
        $this->service->apagar($orcamento);

        return to_route('orcamentos.index')->with('sucesso', "Rascunho {$ref} apagado.");
    }

    public function validar(Request $request, Orcamento $orcamento): RedirectResponse
    {
        $o = $this->service->validar($orcamento, $request->user());

        return back()->with('sucesso', "Orçamento validado com o número {$o->numero}.");
    }

    public function voltarARascunho(Orcamento $orcamento): RedirectResponse
    {
        $this->service->voltarARascunho($orcamento);

        return back()->with('sucesso', 'O orçamento voltou a rascunho e pode ser alterado.');
    }

    public function fechar(Request $request, Orcamento $orcamento): RedirectResponse
    {
        $dados = $request->validate(['assinado' => ['required', 'boolean'], 'nota' => ['nullable', 'string', 'max:255']]);
        $this->service->fechar($orcamento, (bool) $dados['assinado'], $dados['nota'] ?? null);

        return back()->with('sucesso', $dados['assinado'] ? 'Orçamento classificado como assinado.' : 'Orçamento classificado como não assinado.');
    }

    public function reabrir(Orcamento $orcamento): RedirectResponse
    {
        $this->service->reabrir($orcamento);

        return back()->with('sucesso', 'Orçamento reaberto.');
    }

    public function classificarFacturado(Orcamento $orcamento): RedirectResponse
    {
        $this->service->classificarFacturado($orcamento);

        return back()->with('sucesso', 'Orçamento classificado como facturado.');
    }

    /** Orçamento aceite → reserva com as mesmas linhas; pede a data do evento (proposta: a data de entrega do orçamento) */
    public function criarReserva(Request $request, Orcamento $orcamento): RedirectResponse
    {
        $dados = $request->validate([
            'data_evento' => ['required', 'date'],
            'data_fim_evento' => ['nullable', 'date', 'after_or_equal:data_evento'],
        ], ['data_fim_evento.after_or_equal' => 'O fim do evento não pode ser antes do início.'], ['data_evento' => 'data do evento']);

        $inicio = CarbonImmutable::parse($dados['data_evento']);
        $fim = CarbonImmutable::parse($dados['data_fim_evento'] ?? $dados['data_evento']);
        $r = $this->service->criarReserva($orcamento, [
            'data_evento' => $inicio->toDateString(),
            'data_fim_evento' => $fim->toDateString(),
            'data_entrega' => $inicio->toDateString(),
            'data_recolha' => $fim->toDateString(),
            'dias' => (int) $inicio->diffInDays($fim) + 1,
        ], $request->user());

        return to_route('reservas.show', $r)->with('sucesso', "Reserva {$r->numero} criada a partir do orçamento {$orcamento->numero}. Reveja as datas e confirme.");
    }

    public function criarFactura(Request $request, Orcamento $orcamento): RedirectResponse
    {
        $f = $this->service->criarFactura($orcamento, $request->user());

        return to_route('facturas.show', $f)->with('sucesso', "Factura criada a partir do orçamento {$orcamento->numero}. Reveja e valide.");
    }

    public function imprimir(Orcamento $orcamento): Response
    {
        $orcamento->load(['terceiro', 'linhas']);

        return Inertia::render('documentos/imprimir', [
            'tipo' => 'orcamento',
            'documento' => [
                ...$this->cabecalho($orcamento),
                'data_fim_validade' => $orcamento->data_fim_validade?->toDateString(),
            ],
            'empresa' => app(Definicoes::class)->empresa(),
            'rodape' => app(Definicoes::class)->rodape('orcamento'),
        ]);
    }

    public function adicionarLinha(GuardarLinhaRequest $request, Orcamento $orcamento): RedirectResponse
    {
        $this->service->adicionarLinha($orcamento, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, Orcamento $orcamento, OrcamentoLinha $linha): RedirectResponse
    {
        abort_unless($linha->orcamento_id === $orcamento->id, 404);
        $this->service->actualizarLinha($orcamento, $linha, $request->validated());

        return back();
    }

    public function removerLinha(Orcamento $orcamento, OrcamentoLinha $linha): RedirectResponse
    {
        abort_unless($linha->orcamento_id === $orcamento->id, 404);
        $this->service->removerLinha($orcamento, $linha);

        return back();
    }
}
