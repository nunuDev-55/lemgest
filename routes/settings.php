<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth:web')->group(function () {
    Route::redirect('definicoes', 'definicoes/perfil');

    Route::get('definicoes/perfil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('definicoes/perfil', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('definicoes/perfil', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('definicoes/senha', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('definicoes/senha', [PasswordController::class, 'update'])->name('password.update');

    Route::get('definicoes/aparencia', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
