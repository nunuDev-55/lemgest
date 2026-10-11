<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Que endereços são públicos: o site, o catálogo, a área do cliente e o logótipo.
 * Tudo o resto é o sistema interno da LemServ (só a equipa).
 */
final class Publico
{
    /** Padrões de caminho (Request::is) das páginas públicas */
    public const CAMINHOS = ['/', 'catalogo', 'catalogo/*', 'conta', 'conta/*'];

    /** Também públicos, mas não são páginas: logótipo, estado do servidor e ficheiros compilados */
    public const RECURSOS = ['empresa/logotipo', 'estado/*', 'up', 'build/*', 'img/*', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'manifest.json', 'robots.txt'];

    public static function caminho(Request $request): bool
    {
        return $request->is(...self::CAMINHOS);
    }

    public static function recurso(Request $request): bool
    {
        return self::caminho($request) || $request->is(...self::RECURSOS);
    }
}
