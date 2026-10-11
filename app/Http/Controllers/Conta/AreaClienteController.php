<?php

namespace App\Http\Controllers\Conta;

use App\Http\Controllers\Concerns\DadosDocumento;
use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use App\Models\Factura;
use App\Models\Reserva;
use App\Support\Definicoes;
use App\Support\Opcoes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Área do cliente: os seus dados e, conforme o perfil Cliente, as suas reservas e as suas facturas.
 * Tudo é filtrado pela ficha de cliente da conta: uma reserva ou factura de outro cliente dá 404.
 */
class AreaClienteController extends Controller
{
    use DadosDocumento;

    public function inicio(Request $request): Response
    {
        $conta = $this->conta($request);
        $hoje = today()->toDateString();

        return Inertia::render('conta/inicio', [
            'proximas' => ! $conta->pode('conta.reservas') ? null : $conta->terceiro->reservas()
                ->whereIn('estado', [Reserva::PEDIDO, Reserva::CONFIRMADA, Reserva::ENTREGUE])
                ->whereDate('data_recolha', '>=', $hoje)
                ->orderBy('data_evento')->limit(5)->get()
                ->map(fn (Reserva $r) => $this->reservaResumo($r)),
            'porPagar' => ! $conta->pode('conta.documentos') ? null : $this->facturasDoCliente($conta)->where('estado', Factura::VALIDADA)->orderBy('data_vencimento')->get()
                ->map(fn (Factura $f) => $this->facturaResumo($f)),
        ]);
    }

    public function reservas(Request $request): Response
    {
        return Inertia::render('conta/reservas', [
            'reservas' => $this->conta($request)->terceiro->reservas()
                ->latest('data_evento')->latest('id')
                ->paginate(15)
                ->through(fn (Reserva $r) => $this->reservaResumo($r)),
        ]);
    }

    public function reserva(Request $request, Reserva $reserva): Response
    {
        abort_unless($reserva->terceiro_id === $this->conta($request)->terceiro_id, 404);
        $reserva->load('linhas');

        return Inertia::render('conta/reserva', [
            'reserva' => [
                ...$this->reservaResumo($reserva),
                'contacto_local' => $reserva->contacto_local,
                'nota_publica' => $reserva->nota_publica,
                'total_sem_iva' => (string) $reserva->total_sem_iva,
                'total_iva' => (string) $reserva->total_iva,
                'linhas' => $reserva->linhas->map->paraEcra()->values(),
            ],
            'facturas' => $reserva->facturas()->where('estado', '!=', Factura::RASCUNHO)->get()
                ->map(fn (Factura $f) => $this->facturaResumo($f)),
        ]);
    }

    public function facturas(Request $request): Response
    {
        return Inertia::render('conta/facturas', [
            'facturas' => $this->facturasDoCliente($this->conta($request))->latest('data')->latest('id')
                ->paginate(15)
                ->through(fn (Factura $f) => $this->facturaResumo($f)),
        ]);
    }

    /** A mesma factura em A4 que a LemServ imprime, sem as notas internas */
    public function factura(Request $request, Factura $factura): Response
    {
        abort_unless($factura->terceiro_id === $this->conta($request)->terceiro_id && $factura->estado !== Factura::RASCUNHO, 404);
        $factura->load(['terceiro', 'linhas', 'pagamentos', 'reserva']);
        $definicoes = app(Definicoes::class);

        return Inertia::render('facturas/imprimir', [
            'factura' => Arr::except($this->fichaFactura($factura), ['nota_privada', 'validada_por', 'motivo_abandono']),
            'empresa' => $definicoes->empresa(),
            'rodape' => $definicoes->rodape('factura'),
        ]);
    }

    public function dados(Request $request): Response
    {
        $conta = $this->conta($request);

        return Inertia::render('conta/dados', [
            'conta' => $conta->only(['nome', 'email', 'telemovel', 'nuit', 'provincia', 'cidade', 'bairro', 'morada']),
            'provincias' => Opcoes::paraSelect(Opcoes::PROVINCIAS),
        ]);
    }

    public function guardarDados(Request $request): RedirectResponse
    {
        $conta = $this->conta($request);
        $request->merge(['telemovel' => RegistoController::telemovel((string) $request->input('telemovel'))]);
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:190'],
            'telemovel' => ['required', 'regex:/^\+258 8[2-7] \d{3} \d{4}$/'],
            'provincia' => ['required', Rule::in(array_keys(Opcoes::PROVINCIAS))],
            'cidade' => ['required', 'string', 'max:100'],
            'bairro' => ['nullable', 'string', 'max:100'],
            'morada' => ['nullable', 'string', 'max:255'],
        ], ['telemovel.regex' => 'Escreva um número de telemóvel de Moçambique, por exemplo 84 123 4567.'], [
            'telemovel' => 'telemóvel', 'provincia' => 'província', 'morada' => 'rua e número',
        ]);

        $conta->update($dados);
        activity('contas')->performedOn($conta)->event('updated')->log("O cliente {$conta->nome} alterou os seus dados");

        return back()->with('sucesso', 'Dados guardados.');
    }

    public function mudarSenha(Request $request): RedirectResponse
    {
        $conta = $this->conta($request);
        $dados = $request->validate([
            'senha_actual' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [], ['senha_actual' => 'senha actual', 'password' => 'senha nova']);

        if (! Hash::check($dados['senha_actual'], $conta->password)) {
            throw ValidationException::withMessages(['senha_actual' => 'A senha actual está errada.']);
        }
        $conta->update(['password' => $dados['password']]);

        return back()->with('sucesso', 'Senha alterada.');
    }

    /* ------------------------------------------------------------ */

    private function conta(Request $request): ContaCliente
    {
        /** @var ContaCliente $conta */
        $conta = $request->user('cliente');

        return $conta->loadMissing('terceiro');
    }

    /** Facturas que o cliente pode ver (as que já saíram do rascunho) */
    private function facturasDoCliente(ContaCliente $conta)
    {
        return Factura::where('terceiro_id', $conta->terceiro_id)->where('estado', '!=', Factura::RASCUNHO);
    }

    /** @return array<string, mixed> */
    private function reservaResumo(Reserva $r): array
    {
        return [
            'id' => $r->id,
            'numero' => $r->numero,
            'estado' => $r->estado,
            'data_evento' => $r->data_evento->toDateString(),
            'data_fim_evento' => $r->data_fim_evento->toDateString(),
            'data_entrega' => $r->data_entrega->toDateString(),
            'data_recolha' => $r->data_recolha->toDateString(),
            'dias' => $r->dias,
            'local' => $r->local,
            'tema' => $r->tema,
            'transporte' => $r->transporte,
            'total' => (string) $r->total,
            'atrasada' => $r->recolhaAtrasada(),
        ];
    }

    /** @return array<string, mixed> */
    private function facturaResumo(Factura $f): array
    {
        return [
            'id' => $f->id,
            'numero' => $f->numero,
            'estado' => $f->estado,
            'data' => $f->data->toDateString(),
            'data_vencimento' => $f->data_vencimento?->toDateString(),
            'vencida' => $f->estaVencida(),
            'total' => (string) $f->total,
            'em_falta' => $f->emFalta(),
        ];
    }
}
