<?php

namespace App\Http\Controllers\Conta;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Entrada e saída dos clientes (guarda "cliente"; a equipa entra em /login) */
class EntradaController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('conta/entrar', ['estado' => session('status')]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ], [], ['password' => 'senha']);

        $chave = Str::transliterate(Str::lower($dados['email']).'|'.$request->ip()).'|cliente';
        if (RateLimiter::tooManyAttempts($chave, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Demasiadas tentativas. Tente de novo dentro de '.ceil(RateLimiter::availableIn($chave) / 60).' minuto(s).',
            ]);
        }

        // Sem "lembrar-me": a sessão acaba quando o navegador fecha
        if (! Auth::guard('cliente')->attempt(['email' => $dados['email'], 'password' => $dados['password']], false)) {
            RateLimiter::hit($chave);
            throw ValidationException::withMessages(['email' => 'E-mail ou senha errados.']);
        }
        RateLimiter::clear($chave);

        /** @var ContaCliente $conta */
        $conta = Auth::guard('cliente')->user();
        if (! $conta->activa()) {
            Auth::guard('cliente')->logout();
            throw ValidationException::withMessages(['email' => $conta->motivoSemAcesso()]);
        }

        $request->session()->regenerate();
        $conta->forceFill(['ultimo_acesso_em' => now()])->saveQuietly();

        return redirect()->intended(route('conta.inicio'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('cliente')->logout();
        $request->session()->regenerateToken();

        return to_route('conta.entrar')->with('sucesso', 'Saiu da sua conta.');
    }
}
