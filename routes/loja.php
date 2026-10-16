<?php

use App\Http\Controllers\Loja\CatalogoController;
use App\Http\Controllers\Loja\PedidoController;
use App\Http\Controllers\Loja\SiteController;
use App\Http\Middleware\AcessoCatalogo;
use App\Http\Middleware\GarantirContaActiva;
use App\Http\Middleware\PermissaoCliente;
use Illuminate\Support\Facades\Route;

/*
 * Site público e catálogo (etapas 7 e 8). Separados do sistema interno: controladores próprios (App\Http\Controllers\Loja),
 * só dados escolhidos um a um (trait Vitrine), página base sem as rotas internas, limite de pedidos por endereço
 * e cabeçalhos de segurança (CabecalhosSeguranca). Ver também SistemaInterno, para quando o site for publicado.
 */
Route::middleware('throttle:loja')->group(function () {
    Route::get('/', [SiteController::class, 'inicio'])->name('site.inicio');

    // O catálogo só abre com conta (clientes com "Ver o catálogo"; da equipa, só quem tem "Ver a loja")
    Route::middleware(AcessoCatalogo::class)->group(function () {
        Route::get('catalogo', [CatalogoController::class, 'index'])->name('catalogo.index');
        Route::get('catalogo/{produto}', [CatalogoController::class, 'mostrar'])->whereNumber('produto')->name('catalogo.mostrar');
    });
    // Fotos: públicas, porque a página inicial mostra as peças (sem preço)
    Route::get('catalogo/fotos/{foto}/{tamanho}', [CatalogoController::class, 'foto'])->whereNumber('foto')->name('catalogo.foto');
    Route::get('catalogo/galeria/{foto}/{tamanho}', [CatalogoController::class, 'fotoSite'])->whereNumber('foto')->name('catalogo.galeria');

    // Reservar: só clientes com conta activa e "Pedir reservas pelo catálogo" no perfil Cliente
    Route::middleware(['auth:cliente', GarantirContaActiva::class, PermissaoCliente::class.':loja.reservar'])
        ->prefix('catalogo/reserva')->name('catalogo.reserva.')->controller(PedidoController::class)->group(function () {
            Route::get('/', 'mostrar')->name('mostrar');
            Route::post('linhas', 'adicionar')->name('adicionar');
            Route::put('linhas/{produto}', 'actualizar')->whereNumber('produto')->name('actualizar');
            Route::delete('linhas/{produto}', 'remover')->whereNumber('produto')->name('remover');
            Route::post('/', 'enviar')->middleware('throttle:6,1')->name('enviar');
        });
});
