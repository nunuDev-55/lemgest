<?php

namespace App\Http\Middleware;

use App\Support\Publico;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;
use Symfony\Component\HttpFoundation\Response;

/**
 * Separa o sistema interno do site público quando o LemGest for publicado na internet (config/lemgest.php → publicacao):
 *
 * - dominio_publico: nesse endereço só existem o site, o catálogo e a área do cliente; o resto dá "página não encontrada".
 * - redes_sistema: o sistema interno (login da equipa, painel, facturas...) só abre a partir destas redes (ex.: a rede do escritório).
 *
 * Sem nada configurado (instalação local, como hoje) não muda nada.
 */
class SistemaInterno
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Publico::recurso($request)) {
            return $next($request);
        }

        $dominio = config('lemgest.publicacao.dominio_publico');
        if ($dominio && strcasecmp($request->getHost(), $dominio) === 0) {
            abort(404);
        }

        $redes = config('lemgest.publicacao.redes_sistema');
        if ($redes && ! IpUtils::checkIp((string) $request->ip(), $redes)) {
            abort(404);
        }

        return $next($request);
    }
}
