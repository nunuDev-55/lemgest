<?php

namespace App\Http\Middleware;

use App\Support\Publico;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cabeçalhos de segurança em todas as respostas. Nas páginas públicas (site, catálogo, área do cliente)
 * vai também uma política de conteúdo (CSP) que só deixa correr os scripts do próprio LemGest.
 */
class CabecalhosSeguranca
{
    public function handle(Request $request, Closure $next): Response
    {
        $resposta = $next($request);

        $resposta->headers->set('X-Content-Type-Options', 'nosniff');
        $resposta->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $resposta->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $resposta->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

        // Com o Vite em modo de desenvolvimento os scripts vêm de outro endereço: aí não se aplica
        if (Publico::caminho($request) && ! Vite::isRunningHot()) {
            $resposta->headers->set('Content-Security-Policy', implode('; ', [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob:",
                "font-src 'self' data:",
                "connect-src 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
            ]));
        }

        return $resposta;
    }
}
