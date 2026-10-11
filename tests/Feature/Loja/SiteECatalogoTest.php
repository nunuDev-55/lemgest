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

    public function test_visitante_ve_o_site_e_o_catalogo_sem_precos(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->component('site/inicio')
            ->where('destaques.0.nome', 'Sofá chesterfield')
            ->where('destaques.0.preco_dia', null)
            ->where('cliente', null));

        $this->get('/catalogo')->assertInertia(fn (Assert $p) => $p
            ->component('site/catalogo')
            ->has('produtos', 1)
            ->where('produtos.0.preco_dia', null)
            ->where('produtos.0', fn ($c) => ! collect($c)->has('preco_compra') && ! collect($c)->has('quantidade_total')));

        $this->get("/catalogo/{$this->sofa->id}")->assertOk();
        $this->get("/catalogo/{$this->escondido->id}")->assertNotFound();
        // Sem conta não se reserva
        $this->get('/catalogo/reserva')->assertRedirect('/conta/entrar');
    }

    public function test_paginas_publicas_nao_levam_as_rotas_internas_e_tem_cabecalhos_de_seguranca(): void
    {
        $resposta = $this->get('/catalogo');
        $resposta->assertHeader('X-Frame-Options', 'SAMEORIGIN')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString("frame-ancestors 'none'", (string) $resposta->headers->get('Content-Security-Policy'));
        $this->assertStringNotContainsString('administracao', $resposta->getContent());
        $this->assertStringNotContainsString('Ziggy', $resposta->getContent());
    }

    public function test_cliente_ve_precos_e_disponibilidade(): void
    {
        $this->actingAs($this->conta(), 'cliente');
        $dia = today()->addDays(10)->toDateString();

        $this->get("/catalogo?de={$dia}&ate={$dia}")->assertInertia(fn (Assert $p) => $p
            ->where('produtos.0.preco_dia', '1740.00')
            ->where('produtos.0.disponivel', 10)
            ->where('podeReservar', true));

        // Sem "Ver o catálogo" no perfil Cliente, volta a ser como um visitante
        Role::findByName(Permissoes::CLIENTE, 'cliente')->revokePermissionTo('loja.catalogo');
        $this->get('/catalogo')->assertInertia(fn (Assert $p) => $p->where('produtos.0.preco_dia', null));
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
        $this->get('/catalogo')->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.20'])->get('/login')->assertOk();

        config(['lemgest.publicacao.redes_sistema' => [], 'lemgest.publicacao.dominio_publico' => 'lemserv.test']);
        $this->get('http://lemserv.test/login')->assertNotFound();
        $this->get('http://lemserv.test/catalogo')->assertOk();
    }
}
