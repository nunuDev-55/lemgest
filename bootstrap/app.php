<?php

use App\Http\Middleware\CabecalhosSeguranca;
use App\Http\Middleware\GarantirUtilizadorActivo;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SistemaInterno;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Os clientes entram e saem pela área do cliente (/conta) e reservam no catálogo; a equipa entra pelo /login e /painel
        $paraClientes = fn (Request $request) => $request->is('conta', 'conta/*', 'catalogo', 'catalogo/*');
        $middleware->redirectGuestsTo(fn (Request $request) => $paraClientes($request) ? route('conta.entrar') : route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => $paraClientes($request) ? route('conta.inicio') : route('dashboard'));

        $middleware->web(prepend: [
            SistemaInterno::class,
        ]);
        $middleware->web(append: [
            CabecalhosSeguranca::class,
            GarantirUtilizadorActivo::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
