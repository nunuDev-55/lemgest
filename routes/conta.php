<?php

use App\Http\Controllers\Conta\AreaClienteController;
use App\Http\Controllers\Conta\EntradaController;
use App\Http\Controllers\Conta\NovaSenhaController;
use App\Http\Controllers\Conta\RegistoController;
use App\Http\Middleware\GarantirContaActiva;
use App\Http\Middleware\PermissaoCliente;
use Illuminate\Support\Facades\Route;

/*
 * Área do cliente (etapa 6). Guarda própria ("cliente"): uma conta de cliente nunca abre o sistema interno,
 * e uma sessão da equipa não serve aqui.
 */
Route::prefix('conta')->name('conta.')->group(function () {
    Route::middleware('guest:cliente')->group(function () {
        Route::get('entrar', [EntradaController::class, 'create'])->name('entrar');
        Route::post('entrar', [EntradaController::class, 'store'])->middleware('throttle:10,1')->name('entrar.store');
        Route::get('registar', [RegistoController::class, 'create'])->name('registar');
        Route::post('registar', [RegistoController::class, 'store'])->middleware('throttle:6,1')->name('registar.store');
        Route::get('recuperar', [NovaSenhaController::class, 'pedir'])->name('recuperar');
        Route::post('recuperar', [NovaSenhaController::class, 'enviar'])->middleware('throttle:6,1')->name('recuperar.enviar');
        Route::get('nova-senha/{token}', [NovaSenhaController::class, 'escolher'])->name('nova-senha');
        Route::post('nova-senha', [NovaSenhaController::class, 'guardar'])->name('nova-senha.guardar');
    });

    Route::middleware(['auth:cliente', GarantirContaActiva::class])->group(function () {
        Route::get('/', [AreaClienteController::class, 'inicio'])->name('inicio');
        // O perfil Cliente (Administração → Perfis e permissões) diz o que cada conta vê
        Route::middleware(PermissaoCliente::class.':conta.reservas')->group(function () {
            Route::get('reservas', [AreaClienteController::class, 'reservas'])->name('reservas');
            Route::get('reservas/{reserva}', [AreaClienteController::class, 'reserva'])->name('reserva');
        });
        Route::middleware(PermissaoCliente::class.':conta.documentos')->group(function () {
            Route::get('facturas', [AreaClienteController::class, 'facturas'])->name('facturas');
            Route::get('facturas/{factura}', [AreaClienteController::class, 'factura'])->name('factura');
        });
        Route::get('dados', [AreaClienteController::class, 'dados'])->name('dados');
        Route::put('dados', [AreaClienteController::class, 'guardarDados'])->name('dados.guardar');
        Route::put('senha', [AreaClienteController::class, 'mudarSenha'])->name('senha');
        Route::post('sair', [EntradaController::class, 'destroy'])->name('sair');
    });
});
