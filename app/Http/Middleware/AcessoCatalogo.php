<?php

namespace App\Http\Middleware;

use App\Models\ContaCliente;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * O catálogo só abre com conta:
 * - clientes com conta activa e "Ver o catálogo" no perfil Cliente;
 * - da equipa, só quem tem "Ver a loja" (o Administrador tem sempre; os outros perfis, se o Administrador o der).
 * Os visitantes vão para Entrar / Criar conta e voltam ao catálogo depois de entrar.
 */
class AcessoCatalogo
{
    public function handle(Request $request, Closure $next): Response
    {
        $conta = Auth::guard('cliente')->user();
        if ($conta instanceof ContaCliente && $conta->activa()) {
            if ($conta->pode('loja.catalogo')) {
                return $next($request);
            }

            return redirect()->route('conta.inicio')->with('erro', 'A sua conta ainda não tem acesso ao catálogo. Fale com a LemServ.');
        }

        $equipa = Auth::guard('web')->user();
        if ($equipa instanceof User && $equipa->active && $equipa->can('loja.ver')) {
            return $next($request);
        }

        return redirect()->guest(route('conta.entrar'))
            ->with('status', 'Para ver o catálogo, entre na sua conta ou crie uma: é rápido e grátis.');
    }
}
