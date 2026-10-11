<?php

namespace App\Http\Middleware;

use App\Models\ContaCliente;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Área do cliente: só contas activas e ligadas a uma ficha de cliente.
 * Se a LemServ suspender a conta com a sessão aberta, o cliente sai no pedido seguinte.
 */
class GarantirContaActiva
{
    public function handle(Request $request, Closure $next): Response
    {
        $conta = Auth::guard('cliente')->user();

        if ($conta instanceof ContaCliente && ! $conta->activa()) {
            Auth::guard('cliente')->logout();
            $request->session()->regenerateToken();

            return redirect()->route('conta.entrar')->with('erro', $conta->motivoSemAcesso());
        }

        return $next($request);
    }
}
