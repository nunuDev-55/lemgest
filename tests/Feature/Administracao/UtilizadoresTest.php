<?php

namespace Tests\Feature\Administracao;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UtilizadoresTest extends TestCase
{
    use RefreshDatabase;

    private function dadosNovoUtilizador(array $alterar = []): array
    {
        return [
            'name' => 'Ana Macuácua',
            'email' => 'ana@lemserv.co.mz',
            'phone' => '84 123 4567',
            'perfil' => 'Comercial',
            'password' => 'SenhaForte2026',
            'password_confirmation' => 'SenhaForte2026',
            ...$alterar,
        ];
    }

    public function test_administrador_ve_a_lista_de_utilizadores(): void
    {
        $admin = $this->administrador(['name' => 'Admin Principal']);

        $this->actingAs($admin)
            ->get('/administracao/utilizadores')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administracao/utilizadores/index')
                ->where('utilizadores.data.0.name', 'Admin Principal')
                ->where('utilizadores.data.0.perfil', 'Administrador')
                ->where('resumo.total', 1));
    }

    public function test_sem_permissao_recebe_403(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->get('/administracao/utilizadores')->assertForbidden();
        $this->actingAs($comercial)->post('/administracao/utilizadores', $this->dadosNovoUtilizador())->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'ana@lemserv.co.mz']);
    }

    public function test_quem_so_pode_ver_nao_pode_criar(): void
    {
        $leitor = $this->utilizadorComPermissoes(['utilizadores.ver']);

        $this->actingAs($leitor)->get('/administracao/utilizadores')->assertOk();
        $this->actingAs($leitor)->post('/administracao/utilizadores', $this->dadosNovoUtilizador())->assertForbidden();
    }

    public function test_administrador_cria_utilizador_com_perfil(): void
    {
        $admin = $this->administrador();

        $this->actingAs($admin)
            ->post('/administracao/utilizadores', $this->dadosNovoUtilizador())
            ->assertRedirect()
            ->assertSessionHas('sucesso');

        $ana = User::where('email', 'ana@lemserv.co.mz')->firstOrFail();
        $this->assertTrue($ana->hasRole('Comercial'));
        $this->assertTrue($ana->active);
    }

    public function test_dados_invalidos_voltam_com_erros(): void
    {
        $admin = $this->administrador(['email' => 'admin@lemserv.co.mz']);

        $this->actingAs($admin)
            ->post('/administracao/utilizadores', $this->dadosNovoUtilizador([
                'email' => 'admin@lemserv.co.mz', // já existe
                'phone' => '12345',
                'perfil' => 'Perfil que não existe',
                'password_confirmation' => 'outra',
            ]))
            ->assertSessionHasErrors(['email', 'phone', 'perfil', 'password']);
    }

    public function test_editar_sem_senha_mantem_a_senha_actual(): void
    {
        $admin = $this->administrador();
        $user = $this->utilizadorComPerfil('Comercial');
        $senhaAntes = $user->password;

        $this->actingAs($admin)
            ->put("/administracao/utilizadores/{$user->id}", [
                'name' => 'Nome Novo',
                'email' => $user->email,
                'phone' => null,
                'perfil' => 'Financeiro',
                'password' => null,
                'password_confirmation' => null,
            ])
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame('Nome Novo', $user->name);
        $this->assertSame($senhaAntes, $user->password);
        $this->assertTrue($user->hasRole('Financeiro'));
    }

    public function test_desactivar_termina_sessoes_e_impede_a_entrada(): void
    {
        $admin = $this->administrador();
        $user = $this->utilizadorComPerfil('Comercial', ['email' => 'joao@lemserv.co.mz']);
        DB::table('sessions')->insert(['id' => 'sessao-joao', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->actingAs($admin)->post("/administracao/utilizadores/{$user->id}/estado")->assertSessionHas('sucesso');

        $this->assertFalse($user->fresh()->active);
        $this->assertDatabaseMissing('sessions', ['id' => 'sessao-joao']);

        auth()->logout();
        $this->post('/login', ['email' => 'joao@lemserv.co.mz', 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_utilizador_desactivado_com_sessao_aberta_e_desligado(): void
    {
        $user = $this->utilizadorComPerfil('Comercial');
        $user->update(['active' => false]);

        $this->actingAs($user)->get('/painel')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_nao_pode_desactivar_a_propria_conta(): void
    {
        $admin = $this->administrador();

        $this->actingAs($admin)
            ->post("/administracao/utilizadores/{$admin->id}/estado")
            ->assertSessionHasErrors('estado');

        $this->assertTrue($admin->fresh()->active);
    }

    public function test_unico_administrador_nao_perde_o_perfil(): void
    {
        $admin = $this->administrador();
        $gestor = $this->utilizadorComPerfil('Gestor');
        $gestor->givePermissionTo('utilizadores.gerir');

        $this->actingAs($gestor)
            ->put("/administracao/utilizadores/{$admin->id}", [
                'name' => $admin->name,
                'email' => $admin->email,
                'perfil' => 'Comercial',
            ])
            ->assertSessionHasErrors('perfil');

        $this->assertTrue($admin->fresh()->isAdministrador());
    }

    public function test_pesquisa_filtra_por_nome_e_trata_percentagem_como_texto(): void
    {
        $admin = $this->administrador(['name' => 'Admin']);
        $this->utilizadorComPerfil('Comercial', ['name' => 'Carlos Tembe']);
        $this->utilizadorComPerfil('Comercial', ['name' => 'Rita Sitoe']);

        $this->actingAs($admin)
            ->get('/administracao/utilizadores?pesquisa=tembe')
            ->assertInertia(fn (Assert $page) => $page->has('utilizadores.data', 1)->where('utilizadores.data.0.name', 'Carlos Tembe'));

        $this->actingAs($admin)
            ->get('/administracao/utilizadores?pesquisa=%25')
            ->assertInertia(fn (Assert $page) => $page->has('utilizadores.data', 0));
    }
}
