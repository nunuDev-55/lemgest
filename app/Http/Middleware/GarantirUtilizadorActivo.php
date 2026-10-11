<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Se um utilizador for desactivado enquanto tem a sessão aberta,
 * é desligado no pedido seguinte.
 */
class GarantirUtilizadorActivo
{
    public function handle(Request $request, Closure $next): Response
    {
        // Sempre a guarda da equipa: nas páginas do cliente a guarda por omissão passa a ser "cliente"
        $user = $request->user('web');

        if ($user !== null && ! $user->active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'A sua conta foi desactivada. Fale com o administrador.');
        }

        return $next($request);
    }
}
