<?php

namespace Tests\Feature\Loja;

use App\Models\ContaCliente;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Support\Permissoes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Favoritos (♡) do catálogo: cada cliente guarda as suas peças e vê-as em A minha conta → Favoritos */
class FavoritosTest extends TestCase
{
    use RefreshDatabase;

    private Produto $sofa;

    private Produto $escondido;

    protected function setUp(): void
    {
        parent::setUp();
        Permissoes::sincronizar();
        $this->sofa = Produto::factory()->create(['nome' => 'Sofá chesterfield', 'em_aluguer' => true, 'preco_aluguer' => '1500.00', 'taxa_iva' => '16.00', 'na_loja' => true]);
        $this->escondido = Produto::factory()->create(['nome' => 'Protótipo', 'em_aluguer' => true, 'preco_aluguer' => '10', 'na_loja' => false]);
    }

    private function conta(string $email): ContaCliente
    {
        return ContaCliente::forceCreate([
            'nome' => 'Cliente '.$email, 'email' => $email, 'telemovel' => '+258 84 901 2233', 'provincia' => 'MZ-MPM', 'cidade' => 'Maputo',
            'password' => 'senha-segura-1', 'estado' => ContaCliente::ACTIVA, 'terceiro_id' => Terceiro::factory()->create()->id,
        ]);
    }

    public function test_cliente_guarda_e_tira_favoritos_e_ve_a_lista_na_conta(): void
    {
        $nadia = $this->conta('nadia@exemplo.co.mz');
        $this->actingAs($nadia, 'cliente')->post("/catalogo/favoritos/{$this->sofa->id}")->assertRedirect()->assertSessionHas('sucesso');

        $this->get('/catalogo')->assertInertia(fn (Assert $p) => $p->where('favoritos', [$this->sofa->id]));
        $this->get('/conta/favoritos')->assertInertia(fn (Assert $p) => $p
            ->component('conta/favoritos')
            ->has('produtos', 1)
            ->where('produtos.0.nome', 'Sofá chesterfield')
            ->where('produtos.0.preco_dia', '1740.00')
            ->where('produtos.0', fn ($c) => ! collect($c)->has('preco_compra')));

        // Cada conta tem os seus
        $this->actingAs($this->conta('lurdes@exemplo.co.mz'), 'cliente')->get('/catalogo')->assertInertia(fn (Assert $p) => $p->where('favoritos', []));

        // Tocar outra vez no coração tira a peça
        $this->actingAs($nadia, 'cliente')->post("/catalogo/favoritos/{$this->sofa->id}")->assertSessionHas('sucesso');
        $this->assertDatabaseCount('favoritos', 0);
    }

    public function test_peca_que_sai_da_loja_deixa_de_aparecer_nos_favoritos(): void
    {
        $nadia = $this->conta('nadia@exemplo.co.mz');
        $nadia->favoritos()->attach($this->sofa->id);
        $this->sofa->update(['na_loja' => false]);

        $this->actingAs($nadia, 'cliente')->get('/conta/favoritos')->assertInertia(fn (Assert $p) => $p->has('produtos', 0));
        $this->assertDatabaseCount('favoritos', 1);
    }

    public function test_so_com_conta_so_pecas_da_loja_e_so_com_ver_o_catalogo(): void
    {
        $this->post("/catalogo/favoritos/{$this->sofa->id}")->assertRedirect('/conta/entrar');
        $this->get('/conta/favoritos')->assertRedirect('/conta/entrar');

        $this->actingAs($this->conta('nadia@exemplo.co.mz'), 'cliente');
        $this->post("/catalogo/favoritos/{$this->escondido->id}")->assertNotFound();

        Role::findByName(Permissoes::CLIENTE, 'cliente')->revokePermissionTo('loja.catalogo');
        $this->post("/catalogo/favoritos/{$this->sofa->id}")->assertForbidden();
        $this->get('/conta/favoritos')->assertRedirect('/conta');
        $this->assertDatabaseCount('favoritos', 0);
    }
}
