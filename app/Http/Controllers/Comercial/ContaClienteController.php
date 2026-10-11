<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use App\Models\Terceiro;
use App\Services\ContasCliente;
use App\Support\Opcoes;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Contas de clientes da loja: aprovar os pedidos de registo (D7), recusar, suspender e reactivar */
class ContaClienteController extends Controller
{
    public function __construct(private readonly ContasCliente $contas) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', Rule::in([...array_keys(ContaCliente::ESTADOS), 'todas'])],
            'pesquisa' => ['nullable', 'string', 'max:100'],
        ]);
        // Por omissão abre nos pedidos por aprovar, se os houver
        $pendentes = ContaCliente::where('estado', ContaCliente::PENDENTE)->count();
        $estado = match ($filtros['estado'] ?? null) {
            'todas' => null,
            null => $pendentes > 0 ? ContaCliente::PENDENTE : null,
            default => $filtros['estado'],
        };

        $contas = ContaCliente::query()
            ->with(['terceiro:id,nome,codigo_cliente', 'aprovadaPor:id,name'])
            ->when($estado, fn ($q, $e) => $q->where('estado', $e))
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q
                ->where('nome', 'like', Pesquisa::like($t))
                ->orWhere('email', 'like', Pesquisa::like($t))
                ->orWhere('telemovel', 'like', Pesquisa::like($t))))
            ->latest('id')
            ->paginate(20)->withQueryString()
            ->through(fn (ContaCliente $c) => [
                'id' => $c->id,
                'nome' => $c->nome,
                'email' => $c->email,
                'telemovel' => $c->telemovel,
                'nuit' => $c->nuit,
                'local' => collect([$c->morada, $c->bairro, $c->cidade, Opcoes::PROVINCIAS[$c->provincia] ?? null])->filter()->implode(', '),
                'estado' => $c->estado,
                'motivo' => $c->motivo,
                'pedido_em' => $c->created_at?->toIso8601String(),
                'aprovada_em' => $c->aprovada_em?->toIso8601String(),
                'aprovada_por' => $c->aprovadaPor?->name,
                'ultimo_acesso_em' => $c->ultimo_acesso_em?->toIso8601String(),
                'terceiro' => $c->terceiro ? ['id' => $c->terceiro->id, 'nome' => $c->terceiro->nome, 'codigo' => $c->terceiro->codigo_cliente] : null,
                // Fichas que podem ser desta pessoa, para não criar um cliente repetido
                'sugestoes' => $c->estado === ContaCliente::PENDENTE
                    ? $this->contas->sugestoes($c)->map(fn (Terceiro $t) => [
                        'id' => $t->id, 'nome' => $t->nome, 'codigo' => $t->codigo_cliente, 'telemovel' => $t->telemovel ?? $t->telefone, 'email' => $t->email, 'nuit' => $t->nuit,
                    ])->values()
                    : [],
            ]);

        return Inertia::render('terceiros/contas', [
            'contas' => $contas,
            'filtros' => (object) ['estado' => $estado, 'pesquisa' => $filtros['pesquisa'] ?? null],
            'pendentes' => $pendentes,
        ]);
    }

    public function aprovar(Request $request, ContaCliente $conta): RedirectResponse
    {
        $dados = $request->validate(['terceiro_id' => ['nullable', 'integer', Rule::exists('terceiros', 'id')]]);
        $conta = $this->contas->aprovar($conta, $request->user(), $dados['terceiro_id'] ?? null);

        return back()->with('sucesso', "Conta de {$conta->nome} aprovada. O cliente já pode entrar.");
    }

    public function recusar(Request $request, ContaCliente $conta): RedirectResponse
    {
        $dados = $request->validate(['motivo' => ['nullable', 'string', 'max:255']]);
        $this->contas->recusar($conta, $request->user(), $dados['motivo'] ?? null);

        return back()->with('sucesso', "Pedido de {$conta->nome} recusado.");
    }

    public function suspender(Request $request, ContaCliente $conta): RedirectResponse
    {
        $dados = $request->validate(['motivo' => ['nullable', 'string', 'max:255']]);
        $this->contas->suspender($conta, $request->user(), $dados['motivo'] ?? null);

        return back()->with('sucesso', "Conta de {$conta->nome} suspensa.");
    }

    public function reactivar(Request $request, ContaCliente $conta): RedirectResponse
    {
        $this->contas->reactivar($conta, $request->user());

        return back()->with('sucesso', "Conta de {$conta->nome} reactivada.");
    }
}
