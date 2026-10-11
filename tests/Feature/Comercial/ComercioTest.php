<?php

namespace Tests\Feature\Comercial;

use App\Models\Contacto;
use App\Models\Encomenda;
use App\Models\Factura;
use App\Models\Orcamento;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\Stock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ComercioTest extends TestCase
{
    use RefreshDatabase;

    private User $comercial;

    private Terceiro $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->comercial = $this->utilizadorComPerfil('Gestor');
        $this->cliente = Terceiro::factory()->create(['nome' => 'Hotel Costa do Sol', 'termos_pagamento' => '30d']);
    }

    private function orcamentoComLinhas(): Orcamento
    {
        $this->actingAs($this->comercial)->post('/orcamentos', [
            'terceiro_id' => $this->cliente->id, 'data' => '2026-10-01', 'validade_dias' => 15, 'termos_pagamento' => '30d',
        ])->assertSessionHasNoErrors();
        $o = Orcamento::latest('id')->firstOrFail();
        $sofa = Produto::firstWhere('referencia', 'SOFA-RET') ?? Produto::factory()->create(['referencia' => 'SOFA-RET', 'preco' => '1500.00']);
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/linhas", ['produto_id' => $sofa->id, 'quantidade' => '2'])->assertSessionHasNoErrors();
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/linhas", ['descricao' => 'Transporte', 'quantidade' => '1', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);

        return $o->fresh();
    }

    public function test_contactos_na_ficha_do_terceiro_e_na_lista(): void
    {
        $this->actingAs($this->comercial)
            ->post("/terceiros/{$this->cliente->id}/contactos", ['nome' => 'Sónia Mabote', 'cargo' => 'Gestora de eventos', 'telemovel' => '+258 84 555 1234', 'email' => 'sonia@hotel.co.mz'])
            ->assertSessionHasNoErrors();

        $c = Contacto::firstOrFail();
        $this->actingAs($this->comercial)->put("/contactos/{$c->id}", ['nome' => 'Sónia Mabote', 'cargo' => 'Directora comercial'])->assertSessionHasNoErrors();
        $this->assertSame('Directora comercial', $c->fresh()->cargo);

        $this->actingAs($this->comercial)->get("/terceiros/{$this->cliente->id}")
            ->assertInertia(fn (Assert $p) => $p->where('contactos.0.nome', 'Sónia Mabote'));
        $this->actingAs($this->comercial)->get('/contactos?terceiro=costa')
            ->assertInertia(fn (Assert $p) => $p->component('contactos/index')->has('contactos.data', 1));

        $this->actingAs($this->comercial)->delete("/contactos/{$c->id}")->assertSessionHasNoErrors();
        $this->assertDatabaseCount('contactos', 0);
    }

    public function test_orcamento_valida_com_numero_e_validade(): void
    {
        $o = $this->orcamentoComLinhas();
        $this->assertSame('2026-10-16', $o->data_fim_validade->toDateString());
        $this->assertSame('3500.00', $o->total_sem_iva);
        $this->assertSame('4060.00', $o->total);

        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/validar")->assertSessionHasNoErrors();
        $o->refresh();
        $this->assertSame('OR2026/0001', $o->numero);
        $this->assertSame(Orcamento::ABERTO, $o->estado);

        // Aberto: as linhas ficam bloqueadas até voltar a rascunho
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/linhas", ['descricao' => 'Extra', 'quantidade' => '1', 'preco_unitario' => '10', 'taxa_iva' => '16.00'])
            ->assertSessionHasErrors('orcamento');

        // "Modificar" volta a rascunho e, ao validar de novo, mantém o número
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/rascunho")->assertSessionHasNoErrors();
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/validar")->assertSessionHasNoErrors();
        $this->assertSame('OR2026/0001', $o->fresh()->numero);
    }

    public function test_orcamento_assinado_gera_reserva_e_a_reserva_gera_a_factura(): void
    {
        $o = $this->orcamentoComLinhas();
        app(Stock::class)->inicial(Produto::firstWhere('referencia', 'SOFA-RET'), 10, $this->comercial);
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/validar");

        // Ainda aberto: não gera reserva
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/reserva", ['data_evento' => '2026-11-14'])->assertSessionHasErrors('orcamento');

        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/fechar", ['assinado' => true, 'nota' => 'Aceite por telefone'])->assertSessionHasNoErrors();
        $this->assertSame(Orcamento::ASSINADO, $o->fresh()->estado);

        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/reserva", ['data_evento' => '2026-11-14', 'data_fim_evento' => '2026-11-15'])->assertRedirect();
        $r = Reserva::firstOrFail();
        $this->assertSame([$o->id, '2026-11-14', '2026-11-15', 2], [$r->orcamento_id, $r->data_entrega->toDateString(), $r->data_recolha->toDateString(), $r->dias]);
        $this->assertSame('4060.00', $r->total); // as linhas passam como estavam no orçamento
        $this->assertCount(2, $r->linhas);

        // Pedido ainda não se factura
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/factura")->assertSessionHasErrors('reserva');
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar")->assertSessionHasNoErrors();

        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/factura")->assertRedirect();
        $f = Factura::firstOrFail();
        $this->assertSame([$r->id, $o->id, $r->numero], [$f->reserva_id, $f->orcamento_id, $f->ref_cliente]);
        $this->assertSame('4060.00', $f->total);

        // Validar a factura marca o orçamento como facturado
        $this->actingAs($this->comercial)->post("/facturas/{$f->id}/validar")->assertSessionHasNoErrors();
        $this->assertSame(Orcamento::FACTURADO, $o->fresh()->estado);
        $this->assertTrue($r->fresh()->facturada());

        // Uma reserva só tem uma factura activa
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/factura")->assertSessionHasErrors('reserva');

        $this->actingAs($this->comercial)->get("/facturas/{$f->id}")
            ->assertInertia(fn (Assert $p) => $p->has('relacionados', 2)->where('relacionados.0.tipo', 'orcamento')->where('relacionados.1.tipo', 'reserva'));
        $this->actingAs($this->comercial)->get("/reservas/{$r->id}")
            ->assertInertia(fn (Assert $p) => $p->where('reserva.facturada', true)->has('relacionados', 2));
    }

    public function test_orcamento_nao_assinado_e_reaberto(): void
    {
        $o = $this->orcamentoComLinhas();
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/validar");
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/fechar", ['assinado' => false, 'nota' => 'Escolheu outro fornecedor']);
        $this->assertSame(Orcamento::RECUSADO, $o->fresh()->estado);
        $this->assertSame('Escolheu outro fornecedor', $o->fresh()->nota_fecho);

        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/factura")->assertSessionHasErrors('orcamento');
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/reabrir")->assertSessionHasNoErrors();
        $this->assertSame(Orcamento::ABERTO, $o->fresh()->estado);
    }

    public function test_so_rascunhos_sem_numero_se_apagam(): void
    {
        $o = $this->orcamentoComLinhas();
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/validar");
        $this->actingAs($this->comercial)->post("/orcamentos/{$o->id}/rascunho");

        // Já teve número: não se apaga (a numeração não pode ter falhas)
        $this->actingAs($this->comercial)->delete("/orcamentos/{$o->id}")->assertSessionHasErrors('orcamento');

        $outro = $this->orcamentoComLinhas();
        $this->actingAs($this->comercial)->delete("/orcamentos/{$outro->id}")->assertRedirect('/orcamentos');
        $this->assertDatabaseMissing('orcamentos', ['id' => $outro->id]);
    }

    public function test_potencial_pode_ter_orcamento_mas_nao_encomenda(): void
    {
        $potencial = Terceiro::factory()->create(['e_cliente' => false, 'e_potencial' => true]);

        $this->actingAs($this->comercial)->post('/orcamentos', ['terceiro_id' => $potencial->id, 'data' => '2026-10-01', 'validade_dias' => 30, 'termos_pagamento' => 'pronto'])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->comercial)->post('/encomendas', ['terceiro_id' => $potencial->id, 'data' => '2026-10-01', 'termos_pagamento' => 'pronto'])
            ->assertSessionHasErrors('terceiro_id');
    }

    public function test_encomenda_anulada_e_permissoes(): void
    {
        $this->actingAs($this->comercial)->post('/encomendas', ['terceiro_id' => $this->cliente->id, 'data' => '2026-10-01', 'data_entrega' => '2026-10-05', 'termos_pagamento' => 'pronto'])
            ->assertSessionHasNoErrors();
        $e = Encomenda::firstOrFail();
        $this->actingAs($this->comercial)->post("/encomendas/{$e->id}/validar")->assertSessionHasErrors('encomenda'); // sem linhas
        $this->actingAs($this->comercial)->post("/encomendas/{$e->id}/linhas", ['descricao' => 'Tenda 6x6', 'quantidade' => '1', 'preco_unitario' => '7500', 'taxa_iva' => '16.00']);
        $this->actingAs($this->comercial)->post("/encomendas/{$e->id}/validar")->assertSessionHasNoErrors();
        $this->actingAs($this->comercial)->post("/encomendas/{$e->id}/anular")->assertSessionHasNoErrors();
        $this->assertSame(Encomenda::ANULADA, $e->fresh()->estado);

        // A equipa de montagem vê encomendas mas não as altera nem vê orçamentos
        $equipa = $this->utilizadorComPerfil('Equipa de montagem');
        $this->actingAs($equipa)->get("/encomendas/{$e->id}")->assertOk();
        $this->actingAs($equipa)->post("/encomendas/{$e->id}/reabrir")->assertForbidden();
        $this->actingAs($equipa)->get('/orcamentos')->assertForbidden();
    }

    public function test_paginas_do_comercio_abrem(): void
    {
        $o = $this->orcamentoComLinhas();
        $this->actingAs($this->comercial)->get('/comercial')->assertRedirect('/orcamentos'); // a antiga área leva à lista
        $this->actingAs($this->comercial)->get('/orcamentos')->assertInertia(fn (Assert $p) => $p->component('orcamentos/index')->where('totais.total', '4060.00'));
        $this->actingAs($this->comercial)->get('/orcamentos/novo')->assertInertia(fn (Assert $p) => $p->component('orcamentos/formulario'));
        $this->actingAs($this->comercial)->get("/orcamentos/{$o->id}")->assertInertia(fn (Assert $p) => $p->component('orcamentos/mostrar')->has('documento.linhas', 2));
        $this->actingAs($this->comercial)->get("/orcamentos/{$o->id}/editar")->assertInertia(fn (Assert $p) => $p->component('orcamentos/formulario'));
        $this->actingAs($this->comercial)->get("/orcamentos/{$o->id}/imprimir")->assertInertia(fn (Assert $p) => $p->component('documentos/imprimir'));
        $this->actingAs($this->comercial)->get('/encomendas')->assertInertia(fn (Assert $p) => $p->component('encomendas/index'));
        $this->actingAs($this->comercial)->get('/encomendas/nova')->assertInertia(fn (Assert $p) => $p->component('encomendas/formulario'));
    }
}
