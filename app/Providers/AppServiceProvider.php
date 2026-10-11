<?php

namespace App\Providers;

use App\Models\User;
use App\Support\Definicoes;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Configuração da empresa: lida da base de dados uma vez por pedido
        $this->app->scoped(Definicoes::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // O perfil Administrador tem todas as permissões, incluindo as de módulos futuros.
        // Só a equipa tem perfis; uma conta de cliente nunca passa nas permissões
        Gate::before(fn ($user) => $user instanceof User && $user->isAdministrador() ? true : null);

        // A página Produtos e stock abre a quem vê produtos ou só o stock (ex.: equipa de montagem)
        Gate::define('produtos.consultar', fn ($user) => $user instanceof User && ($user->can('produtos.ver') || $user->can('stock.ver')));

        // Cada entrada no sistema fica registada: hora do último acesso e auditoria.
        Event::listen(Login::class, function (Login $evento) {
            $user = $evento->user;
            if (! $user instanceof User) {
                return;
            }

            $user->forceFill(['last_login_at' => now()])->saveQuietly();

            activity('acessos')
                ->causedBy($user)
                ->performedOn($user)
                ->event('login')
                ->withProperties(['ip' => request()->ip()])
                ->log('Entrou no sistema');
        });
    }
}
