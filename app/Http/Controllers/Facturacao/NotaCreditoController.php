<?php

namespace App\Http\Controllers\Facturacao;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Facturacao\GuardarLinhaRequest;
use App\Models\Factura;
use App\Models\NotaCredito;
use App\Models\NotaCreditoLinha;
use App\Services\NotaCreditoService;
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

class NotaCreditoController extends Controller
{
    use DadosDocumento;

    public function __construct(private readonly NotaCreditoService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', Rule::in(array_keys(NotaCredito::ESTADOS))],
            'ref' => ['nullable', 'string', 'max:30'],
            'cliente' => ['nullable', 'string', 'max:100'],
            'factura' => ['nullable', 'string', 'max:30'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $query = NotaCredito::query()
            ->join('terceiros', 'terceiros.id', '=', 'notas_credito.terceiro_id')
            ->join('facturas', 'facturas.id', '=', 'notas_credito.factura_id')
            ->select('notas_credito.*', 'terceiros.nome as cliente_nome', 'facturas.numero as factura_numero')
            ->when($filtros['estado'] ?? null, fn ($q, $e) => $q->where('notas_credito.estado', $e))
            ->when($filtros['ref'] ?? null, fn ($q, $t) => $q->where('notas_credito.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['cliente'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['factura'] ?? null, fn ($q, $t) => $q->where('facturas.numero', 'like', Pesquisa::like($t)))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('notas_credito.data', '>=', $d))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('notas_credito.data', '<=', $d));

        $totais = (clone $query)->reorder()->select([])
            ->selectRaw('COALESCE(SUM(notas_credito.total_sem_iva),0) as sem_iva, COALESCE(SUM(notas_credito.total),0) as total')->first();

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'ref' => 'notas_credito.numero', 'data' => 'notas_credito.data', 'cliente' => 'terceiros.nome',
            'factura' => 'facturas.numero', 'total' => 'notas_credito.total', 'estado' => 'notas_credito.estado',
        ], 'data', 'desc');
        $query->orderByDesc('notas_credito.id');

        $notas = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (NotaCredito $nc) => [
            'id' => $nc->id,
            'referencia' => $nc->referencia(),
            'data' => $nc->data->toDateString(),
            'cliente' => $nc->cliente_nome,
            'terceiro_id' => $nc->terceiro_id,
            'factura_id' => $nc->factura_id,
            'factura' => $nc->factura_numero,
            'motivo' => $nc->motivo,
            'total_sem_iva' => (string) $nc->total_sem_iva,
            'total' => (string) $nc->total,
            'estado' => $nc->estado,
        ]);

        return Inertia::render('notas-credito/index', [
            'notas' => $notas,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'totais' => ['sem_iva' => Dinheiro::normalizar($totais->sem_iva), 'total' => Dinheiro::normalizar($totais->total)],
        ]);
    }

    /** "Criar nota de crédito" na ficha da factura */
    public function store(Request $request, Factura $factura): RedirectResponse
    {
        // A LemServ não usa notas de crédito (config/lemgest.php): para anular uma factura sem pagamentos, "Abandonar"
        abort_unless(config('lemgest.notas_credito'), 403, 'As notas de crédito estão desligadas. Para anular uma factura sem pagamentos, use "Abandonar".');
        $dados = $request->validate([
            'motivo' => ['required', 'string', 'max:255'],
            'copiar_linhas' => ['boolean'],
            'data' => ['nullable', 'date', 'after_or_equal:'.$factura->data->toDateString()],
        ], ['data.after_or_equal' => 'A nota de crédito não pode ter data anterior à da factura.'], ['motivo' => 'motivo']);

        $nc = $this->service->criarAPartirDe($factura, $request->user(), $dados['motivo'], $request->boolean('copiar_linhas', true), $dados['data'] ?? null);

        return to_route('notas-credito.show', $nc)->with('sucesso', 'Rascunho de nota de crédito criado. Ajuste as linhas ao que vai ser creditado e valide.');
    }

    public function show(NotaCredito $notaCredito): Response
    {
        $notaCredito->load(['terceiro', 'linhas', 'factura', 'validadaPor:id,name']);

        return Inertia::render('notas-credito/mostrar', [
            'nota' => $this->paraFicha($notaCredito),
            'produtos' => $notaCredito->eRascunho() ? $this->produtosEmVenda() : [],
            'eventos' => $this->eventos($notaCredito),
            'relacionados' => $this->relacionados('factura', [$notaCredito->factura]),
            'motivos' => NotaCredito::MOTIVOS,
            'metodos' => Opcoes::paraSelect(Opcoes::METODOS_PAGAMENTO),
        ]);
    }

    public function imprimir(NotaCredito $notaCredito): Response
    {
        $notaCredito->load(['terceiro', 'linhas', 'factura']);

        return Inertia::render('notas-credito/imprimir', [
            'nota' => $this->paraFicha($notaCredito),
            'empresa' => app(Definicoes::class)->empresa(),
        ]);
    }

    public function update(Request $request, NotaCredito $notaCredito): RedirectResponse
    {
        $dados = $request->validate([
            'data' => ['required', 'date', 'after_or_equal:'.$notaCredito->factura->data->toDateString()],
            'motivo' => ['required', 'string', 'max:255'],
            'nota_publica' => ['nullable', 'string', 'max:5000'],
            'nota_privada' => ['nullable', 'string', 'max:5000'],
        ], ['data.after_or_equal' => 'A nota de crédito não pode ter data anterior à da factura.'], ['motivo' => 'motivo']);

        $this->service->actualizarCabecalho($notaCredito, $dados);

        return back()->with('sucesso', 'Nota de crédito alterada.');
    }

    public function destroy(NotaCredito $notaCredito): RedirectResponse
    {
        $ref = $notaCredito->referencia();
        $factura = $notaCredito->factura_id;
        $this->service->apagar($notaCredito);

        return to_route('facturas.show', $factura)->with('sucesso', "Rascunho de nota de crédito {$ref} apagado.");
    }

    public function validar(Request $request, NotaCredito $notaCredito): RedirectResponse
    {
        $nc = $this->service->validar($notaCredito, $request->user());

        return back()->with('sucesso', "Nota de crédito validada com o número {$nc->numero}.");
    }

    public function reembolsar(Request $request, NotaCredito $notaCredito): RedirectResponse
    {
        $dados = $request->validate([
            'data' => ['required', 'date', 'before_or_equal:today'],
            'metodo' => ['required', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
            'referencia' => ['nullable', 'string', 'max:60'],
        ], [], ['metodo' => 'método', 'referencia' => 'referência']);

        $this->service->registarReembolso($notaCredito, $dados);

        return back()->with('sucesso', 'Reembolso registado. A nota de crédito ficou fechada.');
    }

    public function adicionarLinha(GuardarLinhaRequest $request, NotaCredito $notaCredito): RedirectResponse
    {
        $this->service->adicionarLinha($notaCredito, $request->validated());

        return back();
    }

    public function actualizarLinha(GuardarLinhaRequest $request, NotaCredito $notaCredito, NotaCreditoLinha $linha): RedirectResponse
    {
        abort_unless($linha->nota_credito_id === $notaCredito->id, 404);
        $this->service->actualizarLinha($linha, $request->validated());

        return back();
    }

    public function removerLinha(NotaCredito $notaCredito, NotaCreditoLinha $linha): RedirectResponse
    {
        abort_unless($linha->nota_credito_id === $notaCredito->id, 404);
        $this->service->removerLinha($linha);

        return back();
    }

    /** @return array<string, mixed> */
    private function paraFicha(NotaCredito $nc): array
    {
        $f = $nc->factura;

        return [
            'id' => $nc->id,
            'referencia' => $nc->referencia(),
            'numero' => $nc->numero,
            'estado' => $nc->estado,
            'data' => $nc->data->toDateString(),
            'motivo' => $nc->motivo,
            'nota_publica' => $nc->nota_publica,
            'nota_privada' => $nc->nota_privada,
            'total_sem_iva' => (string) $nc->total_sem_iva,
            'total_iva' => (string) $nc->total_iva,
            'total' => (string) $nc->total,
            'valor_abatido' => (string) $nc->valor_abatido,
            'valor_reembolso' => (string) $nc->valor_reembolso,
            'reembolsado_em' => $nc->reembolsado_em?->toDateString(),
            'reembolso_metodo' => $nc->reembolso_metodo ? (Opcoes::METODOS_PAGAMENTO[$nc->reembolso_metodo] ?? $nc->reembolso_metodo) : null,
            'reembolso_referencia' => $nc->reembolso_referencia,
            'validada_em' => $nc->validada_em?->toIso8601String(),
            'validada_por' => $nc->validadaPor?->name,
            'factura' => [
                'id' => $f->id,
                'numero' => $f->numero,
                'data' => $f->data->toDateString(),
                'total' => (string) $f->total,
                'em_falta' => $f->emFalta(),
                // Para o rascunho: quanto ainda se pode creditar (o total da factura menos as notas já validadas)
                'creditavel' => $nc->eRascunho() ? $f->creditavel() : null,
            ],
            'terceiro' => $this->terceiroResumo($nc->terceiro),
            'linhas' => $nc->linhas->map->paraEcra()->values(),
        ];
    }
}
