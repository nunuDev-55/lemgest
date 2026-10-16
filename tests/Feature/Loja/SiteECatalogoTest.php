<?php

namespace Tests\Feature\Loja;

use App\Http\Controllers\Loja\PedidoController;
use App\Models\ContaCliente;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\Stock;
use App\Support\Permissoes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Etapas 7 e 8: site público, catálogo e reserva pelo catálogo, separados do sistema interno */
class SiteECatalogoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Produto $sofa;

    private Produto $escondido;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->administrador();
        $this->sofa = Produto::factory()->create([
            'nome' => 'Sofá chesterfield', 'em_aluguer' => true, 'preco_aluguer' => '1500.00', 'taxa_iva' => '16.00',
            'preco_compra' => '9000.00', 'na_loja' => true, 'loja_destaque' => true,
        ]);
        app(Stock::class)->inicial($this->sofa, 10, $this->admin);
        $this->escondido = Produto::factory()->create(['nome' => 'Protótipo', 'em_aluguer' => true, 'preco_aluguer' => '10', 'na_loja' => false]);
        Auth::guard('web')->logout();
    }

    private function conta(): ContaCliente
    {
        return ContaCliente::forceCreate([
            'nome' => 'Nádia Cossa', 'email' => 'nadia@exemplo.co.mz', 'telemovel' => '+258 84 901 2233', 'provincia' => 'MZ-MPM', 'cidade' => 'Maputo',
            'password' => 'senha-segura-1', 'estado' => ContaCliente::ACTIVA, 'terceiro_id' => Terceiro::factory()->create()->id,
        ]);
    }

    public function test_visitante_ve_o_site_mas_o_catalogo_pede_conta(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->component('site/inicio')
            ->where('destaques.0.nome', 'Sofá chesterfield')
            ->where('destaques.0.preco_dia', null)
            ->where('destaques.0', fn ($c) => ! collect($c)->has('preco_compra') && ! collect($c)->has('quantidade_total'))
            ->where('cliente', null));

        $this->get('/catalogo')->assertRedirect('/conta/entrar')->assertSessionHas('status');
        $this->get('/catalogo/reserva')->assertRedirect('/conta/entrar');

        // Depois de entrar, volta à peça que queria ver
        $this->get("/catalogo/{$this->sofa->id}")->assertRedirect('/conta/entrar');
        $this->conta();
        $this->post('/conta/entrar', ['email' => 'nadia@exemplo.co.mz', 'password' => 'senha-segura-1'])->assertRedirect("/catalogo/{$this->sofa->id}");
        $this->get("/catalogo/{$this->sofa->id}")->assertOk()->assertInertia(fn (Assert $p) => $p->where('produto.preco_dia', '1740.00'));
        $this->get("/catalogo/{$this->escondido->id}")->assertNotFound();
    }

    public function test_paginas_publicas_nao_levam_as_rotas_internas_e_tem_cabecalhos_de_seguranca(): void
    {
        $resposta = $this->get('/');
        $resposta->assertHeader('X-Frame-Options', 'SAMEORIGIN')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString("frame-ancestors 'none'", (string) $resposta->headers->get('Content-Security-Policy'));
        $this->assertStringNotContainsString('administracao', $resposta->getContent());
        $this->assertStringNotContainsString('Ziggy', $resposta->getContent());
    }

    public function test_cliente_ve_precos_destaques_ordena_e_ve_a_disponibilidade_na_reserva(): void
    {
        Produto::factory()->create(['nome' => 'Puff redondo', 'em_aluguer' => true, 'preco_aluguer' => '100.00', 'na_loja' => true, 'loja_destaque' => false]);
        $this->actingAs($this->conta(), 'cliente');

        $this->get('/catalogo')->assertInertia(fn (Assert $p) => $p
            ->component('site/catalogo')
            ->has('produtos', 2)
            ->where('produtos.0.nome', 'Sofá chesterfield') // em destaque primeiro
            ->where('produtos.0.preco_dia', '1740.00')
            ->has('destaques', 1)
            ->has('ordens', 5)
            ->where('podeReservar', true));
        $this->get('/catalogo?ordem=preco')->assertInertia(fn (Assert $p) => $p->where('produtos.0.nome', 'Puff redondo'));
        $this->get('/catalogo?ordem=preco_desc')->assertInertia(fn (Assert $p) => $p->where('produtos.0.nome', 'Sofá chesterfield'));
        $this->get('/catalogo?pesquisa=puff')->assertInertia(fn (Assert $p) => $p->has('produtos', 1));

        // As datas escolhem-se em "A minha reserva": aí aparece quantas peças estão livres
        $dia = today()->addDays(10)->toDateString();
        $this->post('/catalogo/reserva/linhas', ['produto_id' => $this->sofa->id, 'quantidade' => 3])->assertSessionHasNoErrors();
        $this->get("/catalogo/reserva?de={$dia}&ate={$dia}")->assertInertia(fn (Assert $p) => $p->where('linhas.0.disponivel', 10));

        // Sem "Ver o catálogo" no perfil Cliente, o catálogo não abre
        Role::findByName(Permissoes::CLIENTE, 'cliente')->revokePermissionTo('loja.catalogo');
        $this->get('/catalogo')->assertRedirect('/conta')->assertSessionHas('erro');
    }

    public function test_reserva_pelo_catalogo_cria_um_pedido(): void
    {
        $conta = $this->conta();
        $this->actingAs($conta, 'cliente');
        $evento = today()->addDays(10)->toDateString();
        $fim = today()->addDays(11)->toDateString();

        $this->post('/catalogo/reserva/linhas', ['produto_id' => $this->escondido->id, 'quantidade' => 1])->assertNotFound();
        $this->post('/catalogo/reserva/linhas', ['produto_id' => $this->sofa->id, 'quantidade' => 4])->assertSessionHasNoErrors();
        $this->get('/catalogo/reserva')->assertInertia(fn (Assert $p) => $p->component('site/reserva')->where('linhas.0.quantidade', 4)->where('carrinho', 4));

        // Mais do que o que está livre não passa; com transporte o local é obrigatório
        $this->put("/catalogo/reserva/linhas/{$this->sofa->id}", ['quantidade' => 11]);
        $this->post('/catalogo/reserva', ['data_evento' => $evento, 'transporte' => true])->assertSessionHasErrors('local');
        $this->post('/catalogo/reserva', ['data_evento' => $evento, 'transporte' => false])->assertSessionHasErrors('linhas');
        $this->put("/catalogo/reserva/linhas/{$this->sofa->id}", ['quantidade' => 4]);

        $this->post('/catalogo/reserva', [
            'data_evento' => $evento, 'data_fim_evento' => $fim, 'transporte' => true, 'local' => 'Salão Polana, Maputo', 'tema' => 'Branco',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $r = Reserva::with('linhas')->firstOrFail();
        $this->assertSame([Reserva::PEDIDO, 'loja', $conta->terceiro_id, 2, true, null], [$r->estado, $r->origem, $r->terceiro_id, $r->dias, $r->transporte, $r->taxa_transporte]);
        // 4 sofás × 2 dias × 1 500 (sem IVA); o transporte entra quando a LemServ fixar a taxa
        $this->assertSame('12000.00', (string) $r->total_sem_iva);
        $this->assertSame(0, PedidoController::pecasNoCarrinho(request()));
        $this->get('/catalogo/reserva')->assertInertia(fn (Assert $p) => $p->has('linhas', 0));

        // A equipa abre o pedido: o histórico mostra o cliente como autor (antes dava erro) e a auditoria também
        $this->actingAs($this->admin, 'web')->get("/reservas/{$r->id}")->assertOk()
            ->assertInertia(fn (Assert $p) => $p->where('eventos', fn ($e) => collect($e)->contains('utilizador', 'Nádia Cossa (cliente, pela loja)')));
        $this->get('/administracao/auditoria')->assertOk();
    }

    public function test_da_equipa_so_o_administrador_ve_a_loja(): void
    {
        // Administrador: acesso automático
        $this->actingAs($this->admin, 'web')->get('/catalogo')->assertInertia(fn (Assert $p) => $p
            ->where('produtos.0.preco_dia', '1740.00')
            ->where('equipa.nome', $this->admin->name)
            ->where('podeReservar', false));
        $this->get('/painel')->assertInertia(fn (Assert $p) => $p->where('auth.permissoes', fn ($l) => collect($l)->contains('loja.ver')));
        // A equipa não faz pedidos: os pedidos são das contas de clientes
        $this->post('/catalogo/reserva/linhas', ['produto_id' => $this->sofa->id, 'quantidade' => 1])->assertRedirect('/conta/entrar');

        // Os outros perfis não entram, até o Administrador lhes dar "Ver a loja" em Perfis e permissões
        $gestor = $this->utilizadorComPerfil('Gestor');
        $this->actingAs($gestor, 'web')->get('/catalogo')->assertRedirect('/conta/entrar');
        $this->actingAs($this->utilizadorComPerfil('Comercial'), 'web')->get('/catalogo')->assertRedirect('/conta/entrar');
        Role::findByName('Gestor', 'web')->givePermissionTo('loja.ver');
        $this->actingAs($gestor->fresh(), 'web')->get('/catalogo')->assertOk();
    }

    public function test_cliente_nunca_entra_no_sistema_interno(): void
    {
        $this->actingAs($this->conta(), 'cliente');
        $this->get('/painel')->assertRedirect('/login');
        $this->get('/administracao/utilizadores')->assertRedirect('/login');
    }

    public function test_publicado_o_sistema_interno_fica_so_na_rede_da_lemserv(): void
    {
        config(['lemgest.publicacao.redes_sistema' => ['192.168.1.0/24']]);
        $this->get('/login', ['REMOTE_ADDR' => '41.220.10.5'])->assertNotFound();
        $this->get('/')->assertOk();
        $this->get('/catalogo')->assertRedirect('/conta/entrar');
        $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.20'])->get('/login')->assertOk();

        config(['lemgest.publicacao.redes_sistema' => [], 'lemgest.publicacao.dominio_publico' => 'lemserv.test']);
        $this->get('http://lemserv.test/login')->assertNotFound();
        $this->get('http://lemserv.test/')->assertOk();
        $this->get('http://lemserv.test/conta/entrar')->assertOk();
    }
}
