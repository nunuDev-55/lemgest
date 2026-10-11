<?php

namespace App\Http\Controllers\Aluguer;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Aluguer\GuardarReservaRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\Factura;
use App\Models\MovimentoStock;
use App\Models\Reserva;
use App\Models\ReservaLinha;
use App\Services\ReservaService;
use App\Support\Definicoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ReservaController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly ReservaService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:activas,pedido,confirmada,entregue,devolvida,cancelada,atrasadas'],
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);
        $hoje = today()->toDateString();

        $query = Reserva::query()
            ->with('terceiro:id,nome')
            ->withExists(['facturas as facturada' => fn ($q) => $q->where('estado', '!=', Factura::ABANDONADA)])
            ->when($filtros['estado'] ?? null, fn ($q, $e) => match ($e) {
                'activas' => $q->whereIn('estado', [Reserva::PEDIDO, Reserva::CONFIRMADA, Reserva::ENTREGUE]),
                'atrasadas' => $q->where('estado', Reserva::ENTREGUE)->whereDate('data_recolha', '<', $hoje),
                default => $q->where('estado', $e),
            })
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q
                ->where('numero', 'like', Pesquisa::like($t))
                ->orWhere('local', 'like', Pesquisa::like($t))
                ->orWhereHas('terceiro', fn ($c) => $c->where('nome', 'like', Pesquisa::like($t)))))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->whereDate('data_fim_evento', '>=', Carbon::parse($d)->toDateString()))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->whereDate('data_evento', '<=', Carbon::parse($d)->toDateString()));

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'numero' => 'numero',
            'evento' => 'data_evento',
            'entrega' => 'data_entrega',
            'total' => 'total',
        ], 'evento', 'desc');

        $reservas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Reserva $r) => [
            ...$this->resumo($r),
            'cliente' => $r->terceiro->nome,
            'terceiro_id' => $r->terceiro_id,
            'facturada' => (bool) $r->facturada,
        ]);

        $daqui7 = today()->addDays(7)->toDateString();

        return Inertia::render('reservas/index', [
            'reservas' => $reservas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'resumo' => [
                'pedidos' => Reserva::where('estado', Reserva::PEDIDO)->count(),
                'entregas' => Reserva::where('estado', Reserva::CONFIRMADA)->whereDate('data_entrega', '>=', $hoje)->whereDate('data_entrega', '<=', $daqui7)->count(),
                'recolhas' => Reserva::where('estado', Reserva::ENTREGUE)->whereDate('data_recolha', '>=', $hoje)->whereDate('data_recolha', '<=', $daqui7)->count(),
                'atrasadas' => Reserva::where('estado', Reserva::ENTREGUE)->whereDate('data_recolha', '<', $hoje)->count(),
            ],
        ]);
    }

    /** Calendário do mês: as reservas (não canceladas) do dia da entrega ao dia da recolha */
    public function calendario(Request $request): Response
    {
        $mes = $request->validate(['mes' => ['nullable', 'date_format:Y-m']])['mes'] ?? today()->format('Y-m');
        $inicio = CarbonImmutable::createFromFormat('Y-m-d', "{$mes}-01")->startOfDay();
        $fim = $inicio->endOfMonth();

        $reservas = Reserva::query()
            ->with('terceiro:id,nome')
            ->where('estado', '!=', Reserva::CANCELADA)
            ->whereDate('data_entrega', '<=', $fim->toDateString())
            ->whereDate('data_recolha', '>=', $inicio->toDateString())
            ->orderBy('data_entrega')
            ->get()
            ->map(fn (Reserva $r) => [...$this->resumo($r), 'cliente' => $r->terceiro->nome]);

        return Inertia::render('reservas/calendario', [
            'mes' => $mes,
            'reservas' => $reservas,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('reservas/formulario', [
            'reserva' => null,
            'clienteId' => $request->integer('terceiro') ?: null,
            'clientes' => $this->clientesParaSelect(comPotenciais: true),
            'taxaTransporte' => app(Definicoes::class)->transporte(),
        ]);
    }

    public function store(GuardarReservaRequest $request): RedirectResponse
    {
        $r = $this->service->criar($request->validated(), $request->user());

        return to_route('reservas.show', $r)->with('sucesso', "Reserva {$r->numero} criada. Acrescente o material e os serviços.");
    }

    public function show(Reserva $reserva): Response
    {
        $reserva->load(['terceiro', 'linhas.produto:id,tipo,referencia', 'linhas.movimentoSaida', 'confirmadaPor:id,name', 'orcamento', 'facturas']);
        $editavel = $reserva->eRascunho();

        return Inertia::render('reservas/mostrar', [
            'reserva' => [
                ...$this->resumo($reserva),
                'origem' => $reserva->origem,
                'contacto_local' => $reserva->contacto_local,
                'nota_publica' => $reserva->nota_publica,
                'nota_privada' => $reserva->nota_privada,
                'total_sem_iva' => (string) $reserva->total_sem_iva,
                'total_iva' => (string) $reserva->total_iva,
                'confirmada_em' => $reserva->confirmada_em?->toIso8601String(),
                'confirmada_por' => $reserva->confirmadaPor?->name,
                'entregue_em' => $reserva->entregue_em?->toIso8601String(),
                'devolvida_em' => $reserva->devolvida_em?->toIso8601String(),
                'motivo_cancelamento' => $reserva->motivo_cancelamento,
                'facturada' => $reserva->facturas->contains(fn ($f) => $f->estado !== Factura::ABANDONADA),
                'terceiro' => $this->terceiroResumo($reserva->terceiro),
                'linhas' => $reserva->linhas->map->paraEcra()->values(),
            ],
            // Pedidos e confirmadas: há material livre para as datas?
            'stock' => $editavel ? (object) $this->service->verificarStock($reserva) : (object) [],
            // Entregues e devolvidas: o que saiu, voltou, se perdeu ou ainda falta, por linha
            'material' => in_array($reserva->estado, [Reserva::ENTREGUE, Reserva::DEVOLVIDA], true) ? $this->material($reserva) : [],
            'produtos' => $editavel ? $this->produtosEmVenda() : [],
            'relacionados' => [
                ...$this->relacionados('orcamento', [$reserva->orcamento]),
                ...$this->relacionados('factura', $reserva->facturas),
            ],
            'eventos' => $this->eventos($reserva),
        ]);
    }

    public function edit(Reserva $reserva): Response|RedirectResponse
    {
        if (! $reserva->eRascunho()) {
            return to_route('reservas.show', $reserva)->with('erro', 'Esta reserva já não se pode alterar.');
        }

        return Inertia::render('reservas/formulario', [
            'reserva' => [
                'id' => $reserva->id,
                'numero' => $reserva->numero,
                ...$reserva->only(['terceiro_id', 'dias', 'local', 'contacto_local', 'transporte', 'taxa_transporte', 'tema', 'nota_publica', 'nota_privada']),
                'data_evento' => $reserva->data_evento->toDateString(),
                'data_fim_evento' => $reserva->data_fim_evento->toDateString(),
                'data_entrega' => $reserva->data_entrega->toDateString(),
                'data_recolha' => $reserva->data_recolha->toDateString(),
            ],
            'clientes' => $this->clientesParaSelect(comPotenciais: true),
            'taxaTransporte' => app(Definicoes::class)->transporte(),
        ]);
    }

    public function update(GuardarReservaRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->service->actualizarCabecalho($reserva, $request->validated());

        return to_route('reservas.show', $reserva)->with('sucesso', 'Reserva alterada.');
    }

    public function adicionarLinha(GuardarLinhaRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->service->adicionarLinha($reserva, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, Reserva $reserva, ReservaLinha $linha): RedirectResponse
    {
        abort_unless($linha->reserva_id === $reserva->id, 404);
        $this->service->actualizarLinha($reserva, $linha, $request->validated());

        return back();
    }

    public function removerLinha(Reserva $reserva, ReservaLinha $linha): RedirectResponse
    {
        abort_unless($linha->reserva_id === $reserva->id, 404);
        $this->service->removerLinha($reserva, $linha);

        return back();
    }

    public function confirmar(Request $request, Reserva $reserva): RedirectResponse
    {
        $this->service->confirmar($reserva, $request->user());

        return back()->with('sucesso', "Reserva {$reserva->numero} confirmada. O material fica guardado para estas datas.");
    }

    public function voltarAPedido(Reserva $reserva): RedirectResponse
    {
        $this->service->voltarAPedido($reserva);

        return back()->with('sucesso', 'A reserva voltou a pedido e deixou de prender o material.');
    }

    public function entregar(Request $request, Reserva $reserva): RedirectResponse
    {
        $dados = $request->validate(['data' => ['nullable', 'date', 'before_or_equal:today']], ['data.before_or_equal' => 'A data não pode ser no futuro.']);
        $this->service->entregar($reserva, $request->user(), $dados['data'] ?? null);

        return back()->with('sucesso', 'Saída registada: o material saiu do armazém.');
    }

    public function devolucao(Request $request, Reserva $reserva): RedirectResponse
    {
        $dados = $request->validate([
            'linhas' => ['required', 'array'],
            'linhas.*.devolvidas' => ['nullable', 'integer', 'min:0'],
            'linhas.*.perdidas' => ['nullable', 'integer', 'min:0'],
            'data' => ['nullable', 'date', 'before_or_equal:today'],
            'nota' => ['nullable', 'string', 'max:150'],
        ], ['data.before_or_equal' => 'A data não pode ser no futuro.']);

        $r = $this->service->registarDevolucao($reserva, $dados['linhas'], $request->user(), $dados['data'] ?? null, $dados['nota'] ?? null);

        return back()->with('sucesso', $r->estado === Reserva::DEVOLVIDA ? 'Devolução registada: o material voltou todo.' : 'Devolução registada. Ainda falta material por voltar.');
    }

    public function criarFactura(Request $request, Reserva $reserva): RedirectResponse
    {
        $f = $this->service->criarFactura($reserva, $request->user());

        return to_route('facturas.show', $f)->with('sucesso', "Factura criada a partir da reserva {$reserva->numero}. Reveja e valide.");
    }

    public function cancelar(Request $request, Reserva $reserva): RedirectResponse
    {
        $dados = $request->validate(['motivo' => ['nullable', 'string', 'max:190']]);
        $this->service->cancelar($reserva, $dados['motivo'] ?? null);

        return back()->with('sucesso', "Reserva {$reserva->numero} cancelada.");
    }

    public function reabrir(Reserva $reserva): RedirectResponse
    {
        $this->service->reabrir($reserva);

        return back()->with('sucesso', 'Reserva reaberta como pedido.');
    }

    /** Lista para a equipa (sem preços): o material a carregar e a conferir na volta */
    public function lista(Reserva $reserva): Response
    {
        $reserva->load(['terceiro', 'linhas.produto:id,tipo,referencia,nome']);

        return Inertia::render('reservas/lista', [
            'reserva' => [
                ...$this->resumo($reserva),
                'contacto_local' => $reserva->contacto_local,
                'nota_publica' => $reserva->nota_publica,
                'terceiro' => $this->terceiroResumo($reserva->terceiro),
                'linhas' => $reserva->linhas->map(fn (ReservaLinha $l) => [
                    'id' => $l->id,
                    'descricao' => $l->descricao,
                    'quantidade' => $l->quantidade,
                    'unidade' => $l->unidade,
                    'material' => $l->temStock(),
                ])->values(),
            ],
            'empresa' => app(Definicoes::class)->empresa(),
        ]);
    }

    /* ------------------------------------------------------------ */

    /** @return array<string, mixed> Campos usados nas listas, no calendário e na ficha */
    private function resumo(Reserva $r): array
    {
        return [
            'id' => $r->id,
            'numero' => $r->numero,
            'estado' => $r->estado,
            'estado_nome' => Reserva::ESTADOS[$r->estado] ?? $r->estado,
            'data_evento' => $r->data_evento->toDateString(),
            'data_fim_evento' => $r->data_fim_evento->toDateString(),
            'data_entrega' => $r->data_entrega->toDateString(),
            'data_recolha' => $r->data_recolha->toDateString(),
            'dias' => $r->dias,
            'local' => $r->local,
            'tema' => $r->tema,
            'transporte' => $r->transporte,
            'taxa_transporte' => $r->taxa_transporte,
            'origem' => $r->origem,
            'total' => (string) $r->total,
            'atrasada' => $r->recolhaAtrasada(),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function material(Reserva $r): array
    {
        $saidas = $r->linhas->pluck('movimento_saida_id')->filter();
        $regressos = MovimentoStock::whereIn('saida_id', $saidas)->get(['saida_id', 'tipo', 'quantidade'])->groupBy('saida_id');

        return $r->linhas->filter(fn (ReservaLinha $l) => $l->movimentoSaida !== null)->map(function (ReservaLinha $l) use ($regressos) {
            $m = $regressos->get($l->movimento_saida_id, collect());

            return [
                'linha_id' => $l->id,
                'descricao' => $l->descricao,
                'saiu' => $l->movimentoSaida->quantidade,
                'devolvidas' => (int) $m->where('tipo', MovimentoStock::DEVOLUCAO)->sum('quantidade'),
                'perdidas' => (int) $m->where('tipo', MovimentoStock::ABATE)->sum('quantidade'),
                'por_voltar' => $l->movimentoSaida->pendente,
            ];
        })->values()->all();
    }
}
