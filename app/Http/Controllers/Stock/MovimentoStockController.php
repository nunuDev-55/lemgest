<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Services\Stock;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MovimentoStockController extends Controller
{
    public function __construct(private Stock $stock) {}

    /** Todos os movimentos, do mais recente para o mais antigo */
    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'produto' => ['nullable', 'integer'],
            'tipo' => ['nullable', Rule::in(array_keys(MovimentoStock::TIPOS))],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ]);

        $movimentos = MovimentoStock::query()
            ->with(['produto:id,referencia,nome', 'terceiro:id,nome', 'autor:id,name', 'origem'])
            ->when($filtros['produto'] ?? null, fn ($q, $id) => $q->where('produto_id', $id))
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->whereHas('produto', fn ($p) => $p->where('nome', 'like', Pesquisa::like($t))->orWhere('referencia', 'like', Pesquisa::like($t))))
            ->when($filtros['tipo'] ?? null, fn ($q, $t) => $q->where('tipo', $t))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->whereDate('data', '>=', Carbon::parse($d)->toDateString()))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->whereDate('data', '<=', Carbon::parse($d)->toDateString()))
            ->latest('id')
            ->paginate(30)->withQueryString()
            ->through(fn (MovimentoStock $m) => [
                ...$m->paraEcra(),
                'produto' => ['id' => $m->produto->id, 'referencia' => $m->produto->referencia, 'nome' => $m->produto->nome],
            ]);

        $produto = isset($filtros['produto']) ? Produto::find($filtros['produto'], ['id', 'referencia', 'nome']) : null;

        return Inertia::render('stock/movimentos', [
            'movimentos' => $movimentos,
            'filtros' => (object) $filtros,
            'produto' => $produto?->only(['id', 'referencia', 'nome']),
            'tipos' => collect(MovimentoStock::TIPOS)->map(fn ($label, $valor) => ['valor' => $valor, 'label' => $label])->values(),
        ]);
    }

    /** Regista um movimento feito à mão (na ficha do produto ou no resumo do stock) */
    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'tipo' => ['required', Rule::in([MovimentoStock::ENTRADA, MovimentoStock::SAIDA, MovimentoStock::DEVOLUCAO, MovimentoStock::ABATE, MovimentoStock::AJUSTE])],
            'produto_id' => ['required', 'integer', Rule::exists('produtos', 'id')->where('tipo', 'produto')],
            'quantidade' => ['required', 'integer', $request->input('tipo') === MovimentoStock::AJUSTE ? 'min:0' : 'min:1', 'max:1000000'],
            'data' => ['required', 'date', 'before_or_equal:today'],
            'devolucao_prevista' => ['nullable', 'date', 'after_or_equal:data'],
            'terceiro_id' => ['nullable', 'integer', Rule::exists('terceiros', 'id')],
            'saida_id' => [Rule::requiredIf($request->input('tipo') === MovimentoStock::DEVOLUCAO), 'nullable', 'integer'],
            'motivo' => [Rule::requiredIf(in_array($request->input('tipo'), [MovimentoStock::ABATE, MovimentoStock::AJUSTE], true)), 'nullable', 'string', 'max:190'],
        ], [
            'saida_id.required' => 'Escolha a saída de onde as peças voltam.',
            'motivo.required' => 'Indique o motivo.',
            'data.before_or_equal' => 'A data não pode ser no futuro.',
            'devolucao_prevista.after_or_equal' => 'A devolução prevista não pode ser antes da saída.',
        ], ['quantidade' => 'quantidade', 'devolucao_prevista' => 'devolução prevista', 'terceiro_id' => 'cliente']);

        Gate::authorize($dados['tipo'] === MovimentoStock::AJUSTE ? 'stock.inventariar' : 'stock.movimentar');

        $produto = Produto::findOrFail($dados['produto_id']);
        $quem = $request->user();
        $q = (int) $dados['quantidade'];
        $saida = isset($dados['saida_id'])
            ? MovimentoStock::where('produto_id', $produto->id)->where('tipo', MovimentoStock::SAIDA)->findOrFail($dados['saida_id'])
            : null;

        switch ($dados['tipo']) {
            case MovimentoStock::ENTRADA:
                $this->stock->entrada($produto, $q, $dados, $quem);
                $mensagem = "Entrada de {$q} peça(s) registada.";
                break;
            case MovimentoStock::SAIDA:
                $this->stock->saida($produto, $q, $dados, $quem);
                $mensagem = "Saída de {$q} peça(s) registada.";
                break;
            case MovimentoStock::DEVOLUCAO:
                $this->stock->devolucao($saida, $q, $dados, $quem);
                $mensagem = "Devolução de {$q} peça(s) registada.";
                break;
            case MovimentoStock::ABATE:
                $this->stock->abate($produto, $q, $dados, $quem, $saida);
                $mensagem = "{$q} peça(s) abatida(s).";
                break;
            default:
                // No ajuste, a quantidade é o que se contou no armazém; as peças alugadas somam-se
                $movimento = $this->stock->contagem($produto, $q, $dados, $quem);
                $mensagem = $movimento === null
                    ? 'A quantidade já estava certa; nada mudou.'
                    : "Total de {$produto->referencia} corrigido para {$movimento->total_depois}.";
        }

        return back()->with('sucesso', $mensagem);
    }
}
