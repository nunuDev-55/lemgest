<?php

namespace App\Http\Controllers\Facturacao;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Facturacao\GuardarFacturaRequest;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\Factura;
use App\Models\FacturaLinha;
use App\Models\NotaCredito;
use App\Services\FacturaService;
use App\Support\Definicoes;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FacturaController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly FacturaService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:rascunho,validada,paga,abandonada,vencidas'],
            'ref' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'ref_cliente' => ['nullable', 'string', 'max:100'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = Factura::query()
            ->join('terceiros', 'terceiros.id', '=', 'facturas.terceiro_id')
            ->select('facturas.*', 'terceiros.nome as cliente_nome')
            ->when($filtros['estado'] ?? null, function ($q, $estado) {
                if ($estado === 'vencidas') {
                    $q->where('facturas.estado', Factura::VALIDADA)->where('facturas.data_vencimento', '<', now()->toDateString());
                } else {
                    $q->where('facturas.estado', $estado);
                }
            })
            ->when($filtros['ref'] ?? null, fn ($q, $t) => ctype_digit($t)
                ? $q->where(fn ($q) => $q->where('facturas.numero', 'like', Pesquisa::like($t))->orWhere('facturas.id', (int) $t))
                : $q->where('facturas.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['ref_cliente'] ?? null, fn ($q, $t) => $q->where('facturas.ref_cliente', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('facturas.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('facturas.data', '<=', $d));

        // Totais de tudo o que o filtro apanha (linha "Total" no fim da lista, como no Dolibarr)
        $totais = (clone $query)->reorder()->select([])->selectRaw('COALESCE(SUM(facturas.total_sem_iva),0) as sem_iva, COALESCE(SUM(facturas.total),0) as total')->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'facturas.numero', 'data' => 'facturas.data', 'vencimento' => 'facturas.data_vencimento',
            'cliente' => 'terceiros.nome', 'total' => 'facturas.total', 'estado' => 'facturas.estado',
        ], 'data', 'desc');
        $query->orderByDesc('facturas.id');

        $facturas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Factura $f) => [
            'id' => $f->id,
            'referencia' => $f->referencia(),
            'data' => $f->data->toDateString(),
            'data_vencimento' => $f->data_vencimento?->toDateString(),
            'cliente' => $f->cliente_nome,
            'terceiro_id' => $f->terceiro_id,
            'total_sem_iva' => (string) $f->total_sem_iva,
            'total' => (string) $f->total,
            'ref_cliente' => $f->ref_cliente,
            'estado' => $f->estado,
            'vencida' => $f->estaVencida(),
            'parcial' => $f->estado === Factura::VALIDADA && bccomp((string) $f->total_pago, '0', 2) > 0,
        ]);

        return Inertia::render('facturas/index', [
            'facturas' => $facturas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => ['sem_iva' => Dinheiro::normalizar($totais->sem_iva), 'total' => Dinheiro::normalizar($totais->total)],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('facturas/criar', [
            'clientes' => $this->clientesParaSelect(),
            'clienteId' => $request->integer('terceiro') ?: null,
            'hoje' => now()->toDateString(),
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarFacturaRequest $request): RedirectResponse
    {
        $factura = $this->service->criar($request->validated(), $request->user());

        return to_route('facturas.show', $factura)->with('sucesso', 'Rascunho criado. Acrescente agora as linhas da factura.');
    }

    public function show(Factura $factura): Response
    {
        $factura->load(['terceiro', 'linhas', 'pagamentos', 'validadaPor:id,name', 'orcamento', 'encomenda', 'reserva', 'notasCredito']);
        $creditavel = in_array($factura->estado, [Factura::VALIDADA, Factura::PAGA], true) ? $factura->creditavel() : '0.00';
        $rascunhoNc = $factura->notasCredito->firstWhere('estado', NotaCredito::RASCUNHO);

        return Inertia::render('facturas/mostrar', [
            'factura' => $this->fichaFactura($factura),
            'produtos' => $factura->eRascunho() ? $this->produtosEmVenda() : [],
            'clientes' => $factura->eRascunho() ? $this->clientesParaSelect() : [],
            'eventos' => $this->eventos($factura),
            'relacionados' => [
                ...$this->relacionados('orcamento', [$factura->orcamento]),
                ...$this->relacionados('reserva', [$factura->reserva]),
                ...$this->relacionados('encomenda', [$factura->encomenda]),
                ...$this->relacionados('nota_credito', $factura->notasCredito),
            ],
            'notaCredito' => [
                'creditavel' => $creditavel,
                'rascunho' => $rascunhoNc ? ['id' => $rascunhoNc->id, 'referencia' => $rascunhoNc->referencia()] : null,
                'motivos' => NotaCredito::MOTIVOS,
            ],
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function imprimir(Factura $factura): Response
    {
        $factura->load(['terceiro', 'linhas', 'pagamentos', 'reserva']);

        $definicoes = app(Definicoes::class);

        return Inertia::render('facturas/imprimir', [
            'factura' => $this->fichaFactura($factura),
            'empresa' => $definicoes->empresa(),
            'rodape' => $definicoes->rodape('factura'),
        ]);
    }

    public function update(GuardarFacturaRequest $request, Factura $factura): RedirectResponse
    {
        $this->service->actualizarCabecalho($factura, $request->validated());

        return back()->with('sucesso', 'Factura alterada.');
    }

    public function destroy(Factura $factura): RedirectResponse
    {
        $ref = $factura->referencia();
        $this->service->apagar($factura);

        return to_route('facturas.index')->with('sucesso', "Rascunho {$ref} apagado.");
    }

    public function validar(Request $request, Factura $factura): RedirectResponse
    {
        $factura = $this->service->validar($factura, $request->user());

        return back()->with('sucesso', "Factura validada com o número {$factura->numero}.");
    }

    public function abandonar(Request $request, Factura $factura): RedirectResponse
    {
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:255']], [], ['motivo' => 'motivo']);
        $this->service->abandonar($factura, $dados['motivo']);

        return back()->with('sucesso', "Factura {$factura->numero} classificada como abandonada.");
    }

    public function reabrir(Factura $factura): RedirectResponse
    {
        $this->service->reabrir($factura);

        return back()->with('sucesso', "Factura {$factura->numero} reaberta.");
    }

    public function adicionarLinha(GuardarLinhaRequest $request, Factura $factura): RedirectResponse
    {
        $this->service->adicionarLinha($factura, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, Factura $factura, FacturaLinha $linha): RedirectResponse
    {
        abort_unless($linha->factura_id === $factura->id, 404);
        $this->service->actualizarLinha($linha, $request->validated());

        return back();
    }

    public function removerLinha(Factura $factura, FacturaLinha $linha): RedirectResponse
    {
        abort_unless($linha->factura_id === $factura->id, 404);
        $this->service->removerLinha($linha);

        return back();
    }

    /** @return array<string, mixed> */
}
