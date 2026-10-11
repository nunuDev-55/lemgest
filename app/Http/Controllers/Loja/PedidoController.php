<?php

namespace App\Http\Controllers\Loja;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use App\Models\Produto;
use App\Services\Disponibilidade;
use App\Services\ReservaService;
use App\Support\Definicoes;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reserva pelo catálogo (perfil Cliente → "Pedir reservas pelo catálogo").
 * O cliente junta material (guardado na sessão), escolhe as datas, o transporte e o local, e envia:
 * fica uma reserva em "Pedido" no LemGest, que a LemServ confirma (o pedido não prende o material — D4).
 */
class PedidoController extends Controller
{
    use Vitrine;

    private const SESSAO = 'loja.reserva';

    /** Peças na reserva em curso (o número no cabeçalho do site) */
    public static function pecasNoCarrinho(Request $request): int
    {
        return $request->hasSession() ? (int) array_sum($request->session()->get(self::SESSAO, [])) : 0;
    }

    public function mostrar(Request $request): Response
    {
        $datas = $request->validate([
            'de' => ['nullable', 'date', 'after_or_equal:today'],
            'ate' => ['nullable', 'date', 'after_or_equal:de'],
        ]);
        $carrinho = $request->session()->get(self::SESSAO, []);
        $produtos = $this->produtosDaLoja()->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal'])->whereIn('id', array_keys($carrinho))->get();
        $livres = ! empty($datas['de']) && $produtos->isNotEmpty()
            ? app(Disponibilidade::class)->noPeriodo($produtos, CarbonImmutable::parse($datas['de']), CarbonImmutable::parse($datas['ate'] ?? $datas['de']))
            : [];
        $conta = $this->conta();

        return Inertia::render('site/reserva', [
            'linhas' => $produtos->map(fn (Produto $p) => [
                ...$this->cartao($p, true),
                'quantidade' => (int) $carrinho[$p->id],
                'disponivel' => isset($livres[$p->id]) ? $livres[$p->id]['disponivel'] : null,
            ])->values(),
            'datas' => (object) $datas,
            'transporte' => app(Definicoes::class)->transporte(),
            'contacto' => trim($conta->nome.', '.$conta->telemovel, ', '),
        ]);
    }

    public function adicionar(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'produto_id' => ['required', 'integer'],
            'quantidade' => ['required', 'integer', 'min:1', 'max:9999'],
        ], [], ['quantidade' => 'quantidade']);
        $produto = $this->produtosDaLoja()->findOrFail($dados['produto_id']);

        $carrinho = $request->session()->get(self::SESSAO, []);
        $carrinho[$produto->id] = min(9999, ($carrinho[$produto->id] ?? 0) + (int) $dados['quantidade']);
        $request->session()->put(self::SESSAO, $carrinho);

        return back()->with('sucesso', "{$produto->nome}: {$carrinho[$produto->id]} na sua reserva.");
    }

    public function actualizar(Request $request, int $produto): RedirectResponse
    {
        $quantidade = (int) $request->validate(['quantidade' => ['required', 'integer', 'min:1', 'max:9999']])['quantidade'];
        $carrinho = $request->session()->get(self::SESSAO, []);
        abort_unless(isset($carrinho[$produto]), 404);
        $carrinho[$produto] = $quantidade;
        $request->session()->put(self::SESSAO, $carrinho);

        return back();
    }

    public function remover(Request $request, int $produto): RedirectResponse
    {
        $carrinho = $request->session()->get(self::SESSAO, []);
        unset($carrinho[$produto]);
        $request->session()->put(self::SESSAO, $carrinho);

        return back();
    }

    /** Envia o pedido: cria a reserva em "Pedido", com as linhas ao preço por dia de cada material */
    public function enviar(Request $request, ReservaService $reservas): RedirectResponse
    {
        $dados = $request->validate([
            'data_evento' => ['required', 'date', 'after:today'],
            'data_fim_evento' => ['nullable', 'date', 'after_or_equal:data_evento'],
            'transporte' => ['required', 'boolean'],
            'local' => ['required_if_accepted:transporte', 'nullable', 'string', 'max:255'],
            'contacto_local' => ['nullable', 'string', 'max:120'],
            'tema' => ['nullable', 'string', 'max:120'],
            'nota' => ['nullable', 'string', 'max:2000'],
        ], [
            'data_evento.after' => 'Os pedidos fazem-se pelo menos com um dia de antecedência.',
            'data_fim_evento.after_or_equal' => 'O fim do evento não pode ser antes do início.',
            'local.required_if_accepted' => 'Com transporte, indique o local do evento.',
        ], ['data_evento' => 'data do evento', 'data_fim_evento' => 'fim do evento', 'contacto_local' => 'contacto no local']);

        $carrinho = $request->session()->get(self::SESSAO, []);
        $produtos = $this->produtosDaLoja()->whereIn('id', array_keys($carrinho))->get();
        if ($produtos->isEmpty()) {
            throw ValidationException::withMessages(['linhas' => 'A sua reserva está vazia. Escolha o material no catálogo.']);
        }

        $de = CarbonImmutable::parse($dados['data_evento']);
        $ate = CarbonImmutable::parse($dados['data_fim_evento'] ?? $dados['data_evento']);
        // Não se pede mais do que o que está livre nessas datas (a LemServ confirma depois)
        $livres = app(Disponibilidade::class)->noPeriodo($produtos, $de, $ate);
        $faltas = $produtos->filter(fn (Produto $p) => $carrinho[$p->id] > ($livres[$p->id]['disponivel'] ?? 0))
            ->map(fn (Produto $p) => "{$p->nome} (livres: ".($livres[$p->id]['disponivel'] ?? 0).')');
        if ($faltas->isNotEmpty()) {
            throw ValidationException::withMessages(['linhas' => 'Nessas datas não há peças suficientes de: '.$faltas->implode(', ').'. Mude as quantidades ou as datas.']);
        }

        $conta = $this->conta();
        $reserva = DB::transaction(function () use ($reservas, $dados, $de, $ate, $conta, $produtos, $carrinho) {
            $r = $reservas->criar([
                'terceiro_id' => $conta->terceiro_id,
                'data_evento' => $de->toDateString(),
                'data_fim_evento' => $ate->toDateString(),
                'data_entrega' => $de->toDateString(),
                'data_recolha' => $ate->toDateString(),
                'dias' => (int) $de->diffInDays($ate) + 1,
                'local' => $dados['local'] ?? null,
                'contacto_local' => $dados['contacto_local'] ?? null,
                'transporte' => (bool) $dados['transporte'],
                'tema' => $dados['tema'] ?? null,
                'nota_publica' => $dados['nota'] ?? null,
            ], null, 'loja');
            foreach ($produtos as $p) {
                $reservas->adicionarLinha($r, ['produto_id' => $p->id, 'quantidade' => (string) $carrinho[$p->id], 'dias' => $r->dias]);
            }

            return $r->fresh();
        });
        $request->session()->forget(self::SESSAO);

        $mensagem = "Pedido de reserva {$reserva->numero} enviado. A LemServ vai confirmar a disponibilidade".
            ($reserva->transporte ? ' e a taxa de transporte' : '').' e contacta-o em breve.';

        return $conta->pode('conta.reservas')
            ? to_route('conta.reserva', $reserva)->with('sucesso', $mensagem)
            : to_route('catalogo.index')->with('sucesso', $mensagem);
    }

    private function conta(): ContaCliente
    {
        /** @var ContaCliente */
        return Auth::guard('cliente')->user();
    }
}
