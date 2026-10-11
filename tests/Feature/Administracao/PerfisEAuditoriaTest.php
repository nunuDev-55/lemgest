<?php

namespace Tests\Feature\Administracao;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PerfisEAuditoriaTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrador_altera_permissoes_de_um_perfil(): void
    {
        $admin = $this->administrador();
        $comercial = Role::findByName('Comercial');

        $this->actingAs($admin)
            ->put("/administracao/perfis/{$comercial->id}", ['permissoes' => ['utilizadores.ver']])
            ->assertSessionHas('sucesso');

        $this->assertTrue($comercial->fresh()->hasPermissionTo('utilizadores.ver'));

        $user = User::factory()->create()->assignRole('Comercial');
        $this->actingAs($user)->get('/administracao/utilizadores')->assertOk();
    }

    public function test_permissao_inexistente_e_recusada(): void
    {
        $admin = $this->administrador();
        $comercial = Role::findByName('Comercial');

        $this->actingAs($admin)
            ->put("/administracao/perfis/{$comercial->id}", ['permissoes' => ['tudo.e.mais.alguma']])
            ->assertSessionHasErrors('permissoes.0');
    }

    public function test_perfil_administrador_nao_pode_ser_alterado(): void
    {
        $admin = $this->administrador();
        $perfilAdmin = Role::findByName('Administrador');

        $this->actingAs($admin)->put("/administracao/perfis/{$perfilAdmin->id}", ['permissoes' => []])->assertForbidden();
    }

    public function test_perfis_do_sistema_nao_podem_ser_apagados_e_novos_sim(): void
    {
        $admin = $this->administrador();

        $this->actingAs($admin)->delete('/administracao/perfis/'.Role::findByName('Gestor')->id)->assertForbidden();

        $this->actingAs($admin)->post('/administracao/perfis', ['name' => 'Motorista'])->assertSessionHas('sucesso');
        $motorista = Role::findByName('Motorista');
        $this->actingAs($admin)->delete("/administracao/perfis/{$motorista->id}")->assertSessionHas('sucesso');
        $this->assertDatabaseMissing('roles', ['name' => 'Motorista']);
    }

    public function test_sem_permissao_nao_ve_perfis_nem_auditoria(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->get('/administracao/perfis')->assertForbidden();
        $this->actingAs($comercial)->get('/administracao/auditoria')->assertForbidden();
    }

    public function test_criar_utilizador_fica_registado_na_auditoria(): void
    {
        $admin = $this->administrador(['name' => 'Admin Principal']);

        $this->actingAs($admin)->post('/administracao/utilizadores', [
            'name' => 'Rita Sitoe',
            'email' => 'rita@lemserv.co.mz',
            'perfil' => 'Financeiro',
            'password' => 'SenhaForte2026',
            'password_confirmation' => 'SenhaForte2026',
        ]);

        $this->assertDatabaseHas('activity_log', ['log_name' => 'utilizadores', 'description' => 'Utilizador criado', 'causer_id' => $admin->id]);
        $this->assertDatabaseHas('activity_log', ['description' => 'Perfil atribuído: Financeiro']);

        // A senha nunca vai para a auditoria
        $this->assertFalse(Activity::all()->contains(fn (Activity $a) => str_contains(json_encode($a->properties), 'SenhaForte2026')));

        $this->actingAs($admin)
            ->get('/administracao/auditoria?modulo=utilizadores')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administracao/auditoria/index')
                ->where('registos.data.0.utilizador', 'Admin Principal')
                ->where('registos.data.0.registo', 'Rita Sitoe'));
    }

    public function test_entrar_no_sistema_fica_registado(): void
    {
        $user = $this->utilizadorComPerfil('Comercial', ['email' => 'carlos@lemserv.co.mz']);

        $this->post('/login', ['email' => 'carlos@lemserv.co.mz', 'password' => 'password']);

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->last_login_at);
        $this->assertDatabaseHas('activity_log', ['log_name' => 'acessos', 'causer_id' => $user->id, 'description' => 'Entrou no sistema']);
    }
}
