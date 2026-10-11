<?php

namespace Tests\Feature\Comercial;

use App\Models\Produto;
use App\Models\Terceiro;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TerceirosEProdutosTest extends TestCase
{
    use RefreshDatabase;

    private function dadosTerceiro(array $alterar = []): array
    {
        return [
            'nome' => 'IKIGAI LDA',
            'e_cliente' => true,
            'tipo_entidade' => 'empresa',
            'nuit' => '400 502 961',
            'morada' => 'Av. Armando Tivane nº 196',
            'cidade' => 'Maputo',
            'provincia' => 'MZ-MPM',
            'pais' => 'MZ',
            'telefone' => '+258 84 122 1986',
            'termos_pagamento' => '30d',
            'metodo_pagamento' => 'transferencia',
            ...$alterar,
        ];
    }

    public function test_criar_cliente_atribui_codigo_e_limpa_o_nuit(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro())->assertSessionHasNoErrors();
        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro(['nome' => 'Hotel Polana', 'e_fornecedor' => true]))->assertSessionHasNoErrors();

        $ikigai = Terceiro::where('nome', 'IKIGAI LDA')->firstOrFail();
        $this->assertSame('400502961', $ikigai->nuit);
        $this->assertSame('CL'.now()->format('Y').'-0001', $ikigai->codigo_cliente);
        $this->assertNull($ikigai->codigo_fornecedor);

        $polana = Terceiro::where('nome', 'Hotel Polana')->firstOrFail();
        $this->assertSame('CL'.now()->format('Y').'-0002', $polana->codigo_cliente);
        $this->assertSame('FO'.now()->format('Y').'-0001', $polana->codigo_fornecedor);
    }

    public function test_empresa_mocambicana_precisa_de_nuit_com_9_digitos(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro(['nuit' => '']))->assertSessionHasErrors('nuit');
        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro(['nuit' => '40050296']))->assertSessionHasErrors('nuit'); // 8 dígitos
        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro(['tipo_entidade' => 'particular', 'nuit' => '']))->assertSessionHasNoErrors();
    }

    public function test_tem_de_ter_pelo_menos_uma_natureza(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->post('/terceiros', $this->dadosTerceiro(['e_cliente' => false]))->assertSessionHasErrors('e_cliente');
    }

    public function test_lista_filtra_clientes_e_fornecedores(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');
        Terceiro::factory()->create(['nome' => 'Cliente A']);
        Terceiro::factory()->fornecedor()->create(['nome' => 'Fornecedor B']);

        $this->actingAs($comercial)->get('/terceiros?natureza=fornecedores')
            ->assertInertia(fn (Assert $p) => $p->component('terceiros/index')->has('terceiros.data', 1)->where('terceiros.data.0.nome', 'Fornecedor B'));
        $this->actingAs($comercial)->get('/terceiros?nome=cliente')
            ->assertInertia(fn (Assert $p) => $p->has('terceiros.data', 1)->where('terceiros.data.0.nome', 'Cliente A'));
    }

    public function test_paginas_de_terceiros_abrem(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');
        $t = Terceiro::factory()->create();

        $this->actingAs($comercial)->get('/terceiros/novo')->assertInertia(fn (Assert $p) => $p->component('terceiros/formulario'));
        $this->actingAs($comercial)->get("/terceiros/{$t->id}")->assertInertia(fn (Assert $p) => $p->component('terceiros/mostrar'));
        $this->actingAs($comercial)->get("/terceiros/{$t->id}/editar")->assertInertia(fn (Assert $p) => $p->component('terceiros/formulario'));
    }

    public function test_comercial_nao_apaga_terceiros(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');
        $t = Terceiro::factory()->create();

        $this->actingAs($comercial)->delete("/terceiros/{$t->id}")->assertForbidden();
        $this->actingAs($this->administrador())->delete("/terceiros/{$t->id}")->assertRedirect('/terceiros');
        $this->assertDatabaseMissing('terceiros', ['id' => $t->id]);
    }

    public function test_criar_produto_com_preco_em_formato_mocambicano(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)->post('/produtos', [
            'referencia' => 'SOFA-RET',
            'tipo' => 'produto',
            'nome' => 'Sofá rectangular',
            'preco' => '1 500,00',
            'taxa_iva' => '16.00',
            'unidade' => 'un',
            'em_venda' => true,
            'em_compra' => false,
        ])->assertSessionHasNoErrors();

        $p = Produto::where('referencia', 'SOFA-RET')->firstOrFail();
        $this->assertSame('1500.00', $p->preco);
        $this->assertSame('1740.00', $p->precoComIva());

        $this->actingAs($armazem)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg->component('produtos/index')->has('produtos.data', 1));
        $this->actingAs($armazem)->get("/produtos/{$p->id}")->assertInertia(fn (Assert $pg) => $pg->component('produtos/mostrar'));
        $this->actingAs($armazem)->get('/produtos/novo')->assertInertia(fn (Assert $pg) => $pg->component('produtos/formulario'));
    }

    public function test_referencia_de_produto_unica_e_sem_espacos(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');
        Produto::factory()->create(['referencia' => 'ALM-01']);

        $base = ['tipo' => 'produto', 'nome' => 'X', 'preco' => '10', 'taxa_iva' => '16.00', 'unidade' => 'un'];
        $this->actingAs($armazem)->post('/produtos', [...$base, 'referencia' => 'ALM-01'])->assertSessionHasErrors('referencia');
        $this->actingAs($armazem)->post('/produtos', [...$base, 'referencia' => 'COM ESPACO'])->assertSessionHasErrors('referencia');
    }
}
