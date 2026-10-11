<?php

namespace App\Http\Controllers\Conta;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as RegraSenha;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** "Esqueci-me da senha" dos clientes (tabela de pedidos própria, separada da equipa) */
class NovaSenhaController extends Controller
{
    public function pedir(): Response
    {
        return Inertia::render('conta/recuperar', ['estado' => session('status')]);
    }

    public function enviar(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // A resposta é sempre a mesma: não revela se o e-mail tem conta
        Password::broker('contas_cliente')->sendResetLink($request->only('email'));

        return back()->with('status', 'Se houver uma conta com este e-mail, enviámos uma ligação para escolher a senha nova.');
    }

    public function escolher(Request $request, string $token): Response
    {
        return Inertia::render('conta/nova-senha', ['token' => $token, 'email' => (string) $request->query('email', '')]);
    }

    public function guardar(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', RegraSenha::min(8)],
        ], [], ['password' => 'senha']);

        $estado = Password::broker('contas_cliente')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (ContaCliente $conta, string $senha) {
                $conta->forceFill(['password' => $senha])->setRememberToken(null);
                $conta->save();
            },
        );

        if ($estado !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'A ligação já não é válida. Peça uma nova.']);
        }

        return to_route('conta.entrar')->with('status', 'Senha alterada. Já pode entrar.');
    }
}
