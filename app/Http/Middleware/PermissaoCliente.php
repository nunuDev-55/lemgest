<?php

namespace App\Http\Middleware;

use App\Models\ContaCliente;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Páginas da área do cliente e da loja que dependem do perfil Cliente.
 * Uso nas rotas: PermissaoCliente::class.':conta.reservas'
 */
class PermissaoCliente
{
    public function handle(Request $request, Closure $next, string $permissao): Response
    {
        $conta = Auth::guard('cliente')->user();

        if (! $conta instanceof ContaCliente || ! $conta->pode($permissao)) {
            if ($request->isMethod('GET')) {
                return redirect()->route('conta.inicio')->with('erro', 'A sua conta não tem acesso a essa página. Fale com a LemServ se precisar.');
            }
            abort(403, 'A sua conta não tem acesso a esta acção.');
        }

        return $next($request);
    }
}
