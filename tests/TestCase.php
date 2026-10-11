<?php

namespace Tests;

use App\Models\User;
use App\Support\Permissoes;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Os testes não dependem de o frontend estar compilado.
        $this->withoutVite();
    }

    /** Cria um utilizador com o perfil indicado (os perfis iniciais são criados se faltarem). */
    protected function utilizadorComPerfil(string $perfil, array $atributos = []): User
    {
        Permissoes::sincronizar();

        return User::factory()->create($atributos)->assignRole($perfil);
    }

    protected function administrador(array $atributos = []): User
    {
        return $this->utilizadorComPerfil(Permissoes::ADMINISTRADOR, $atributos);
    }

    /** Cria um perfil de teste só com as permissões dadas e um utilizador nesse perfil. */
    protected function utilizadorComPermissoes(array $permissoes): User
    {
        Permissoes::sincronizar();
        Role::findOrCreate('Teste', 'web')->syncPermissions($permissoes);

        return User::factory()->create()->assignRole('Teste');
    }
}
