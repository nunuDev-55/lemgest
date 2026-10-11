<?php

namespace App\Services;

use App\Models\User;
use App\Support\Permissoes;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Regras de negócio da gestão de utilizadores.
 *
 * - Tem de existir sempre pelo menos um administrador activo.
 * - Ninguém pode desactivar a própria conta.
 * - Desactivar uma conta termina as sessões abertas dessa pessoa.
 */
class UtilizadorService
{
    /**
     * @param  array{name: string, email: string, phone?: ?string, perfil: string, password: string}  $dados
     */
    public function criar(array $dados): User
    {
        return DB::transaction(function () use ($dados) {
            $user = User::create([
                'name' => $dados['name'],
                'email' => $dados['email'],
                'phone' => $dados['phone'] ?? null,
                'password' => $dados['password'],
                'active' => true,
            ]);

            $user->assignRole($dados['perfil']);
            $this->registarPerfil($user, null, $dados['perfil']);

            return $user;
        });
    }

    /**
     * @param  array{name: string, email: string, phone?: ?string, perfil: string, password?: ?string}  $dados
     */
    public function actualizar(User $user, array $dados): User
    {
        $perfilAnterior = $user->getRoleNames()->first();

        if ($perfilAnterior === Permissoes::ADMINISTRADOR
            && $dados['perfil'] !== Permissoes::ADMINISTRADOR
            && $this->eUltimoAdministradorActivo($user)) {
            throw ValidationException::withMessages([
                'perfil' => 'Este é o único administrador activo. Crie ou active outro administrador antes de lhe mudar o perfil.',
            ]);
        }

        return DB::transaction(function () use ($user, $dados, $perfilAnterior) {
            $alteracoes = [
                'name' => $dados['name'],
                'email' => $dados['email'],
                'phone' => $dados['phone'] ?? null,
            ];
            if (! empty($dados['password'])) {
                $alteracoes['password'] = $dados['password'];
            }
            $user->update($alteracoes);

            if ($perfilAnterior !== $dados['perfil']) {
                $user->syncRoles([$dados['perfil']]);
                $this->registarPerfil($user, $perfilAnterior, $dados['perfil']);
            }

            return $user;
        });
    }

    public function alternarEstado(User $user, User $quemAltera): User
    {
        if ($user->is($quemAltera)) {
            throw ValidationException::withMessages([
                'estado' => 'Não pode desactivar a sua própria conta.',
            ]);
        }

        if ($user->active && $this->eUltimoAdministradorActivo($user)) {
            throw ValidationException::withMessages([
                'estado' => 'Este é o único administrador activo e não pode ser desactivado.',
            ]);
        }

        $novoEstado = ! $user->active;

        DB::transaction(function () use ($user, $novoEstado) {
            // O registo de auditoria é feito à mão para ter uma descrição clara.
            activity()->withoutLogs(fn () => $user->update(['active' => $novoEstado]));

            activity('utilizadores')
                ->performedOn($user)
                ->event($novoEstado ? 'activado' : 'desactivado')
                ->withProperties(['old' => ['active' => ! $novoEstado], 'attributes' => ['active' => $novoEstado]])
                ->log($novoEstado ? 'Utilizador activado' : 'Utilizador desactivado');

            if (! $novoEstado) {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }
        });

        return $user;
    }

    private function eUltimoAdministradorActivo(User $user): bool
    {
        return $user->active
            && $user->isAdministrador()
            && User::administradoresActivos()->count() === 1;
    }

    private function registarPerfil(User $user, ?string $antes, string $depois): void
    {
        activity('utilizadores')
            ->performedOn($user)
            ->event('perfil')
            ->withProperties(['old' => ['perfil' => $antes], 'attributes' => ['perfil' => $depois]])
            ->log($antes === null ? "Perfil atribuído: {$depois}" : "Perfil alterado para {$depois}");
    }
}
