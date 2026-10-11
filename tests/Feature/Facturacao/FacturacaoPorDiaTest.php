<?php

namespace Tests\Feature\Facturacao;

use App\Models\Factura;
use App\Models\NotaCredito;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\Stock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Etapa 5 do roadmap: as linhas de venda têm dias (quantidade × dias × preço por dia) */
class FacturacaoPorDiaTest extends TestCase
{
    use RefreshDatabase;

    private User $gestor;

    private Terceiro $cliente;

    private Produto $cadeiras;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gestor = $this->utilizadorComPerfil('Gestor');
        $this->cliente = Terceiro::factory()->create();
        $this->cadeiras = Produto::factory()->create(['referencia' => 'CAD-TIFF', 'em_venda' => false, 'preco' => '0', 'em_aluguer' => true, 'preco_aluguer' => '120.00']);
        app(Stock::class)->inicial($this->cadeiras, 100, $this->gestor);
    }

    public function test_linha_de_factura_com_dias(): void
    {
        $this->actingAs($this->gestor)->post('/facturas', ['terceiro_id' => $this->cliente->id, 'data' => today()->toDateString(), 'termos_pagamento' => 'pronto'])->assertSessionHasNoErrors();
        $f = Factura::firstOrFail();

        // Sem dias: 1 (as linhas antigas também ficaram com 1, por isso nenhum documento mudou de valor)
        $this->actingAs($this->gestor)->post("/facturas/{$f->id}/linhas", ['produto_id' => $this->cadeiras->id, 'quantidade' => '50'])->assertSessionHasNoErrors();
        $this->assertSame('6000.00', $f->fresh()->total_sem_iva);

        $linha = $f->linhas()->firstOrFail();
        $this->actingAs($this->gestor)->put("/facturas/{$f->id}/linhas/{$linha->id}", [
            'descricao' => 'Cadeiras', 'quantidade' => '50', 'dias' => '3', 'preco_unitario' => '120', 'taxa_iva' => '16.00', 'desconto' => '10',
        ])->assertSessionHasNoErrors();
        // 50 × 3 × 120 = 18 000, menos 10% = 16 200
        $this->assertSame([3, '16200.00'], [$linha->fresh()->dias, $f->fresh()->total_sem_iva]);
        $this->actingAs($this->gestor)->put("/facturas/{$f->id}/linhas/{$linha->id}", [
            'descricao' => 'Cadeiras', 'quantidade' => '50', 'dias' => '0', 'preco_unitario' => '120', 'taxa_iva' => '16.00',
        ])->assertSessionHasErrors('dias');

        $this->actingAs($this->gestor)->get("/facturas/{$f->id}/imprimir")->assertInertia(fn (Assert $p) => $p
            ->where('factura.linhas.0.dias', 3)->where('factura.aluguer', null));
    }

    public function test_factura_de_reserva_leva_os_dias_e_o_periodo_e_a_nota_de_credito_tambem(): void
    {
        $this->actingAs($this->gestor)->post('/reservas', [
            'terceiro_id' => $this->cliente->id, 'data_evento' => today()->addDays(10)->toDateString(), 'data_fim_evento' => today()->addDays(11)->toDateString(),
        ])->assertSessionHasNoErrors();
        $r = Reserva::firstOrFail();
        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/linhas", ['produto_id' => $this->cadeiras->id, 'quantidade' => '50'])->assertSessionHasNoErrors();
        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/confirmar")->assertSessionHasNoErrors();
        $this->assertSame('12000.00', $r->fresh()->total_sem_iva); // 50 × 2 dias × 120

        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/factura")->assertRedirect();
        $f = Factura::firstOrFail();
        $this->assertSame([2, '12000.00', '13920.00'], [$f->linhas()->value('dias'), $f->total_sem_iva, $f->total]);

        $this->actingAs($this->gestor)->get("/facturas/{$f->id}/imprimir")->assertInertia(fn (Assert $p) => $p
            ->where('factura.aluguer.numero', $r->numero)
            ->where('factura.aluguer.data_evento', today()->addDays(10)->toDateString()));

        // A nota de crédito que copia as linhas leva também os dias
        $this->actingAs($this->gestor)->post("/facturas/{$f->id}/validar")->assertSessionHasNoErrors();
        $this->actingAs($this->gestor)->post("/facturas/{$f->id}/nota-credito", ['motivo' => 'Anulação', 'copiar_linhas' => true])->assertSessionHasNoErrors();
        $nc = NotaCredito::firstOrFail();
        $this->assertSame([2, '12000.00'], [$nc->linhas()->value('dias'), $nc->total_sem_iva]);
    }

    public function test_reserva_com_factura_abandonada_pode_facturar_de_novo(): void
    {
        $this->actingAs($this->gestor)->post('/reservas', ['terceiro_id' => $this->cliente->id, 'data_evento' => today()->addDays(5)->toDateString()]);
        $r = Reserva::firstOrFail();
        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/linhas", ['produto_id' => $this->cadeiras->id, 'quantidade' => '10']);
        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/confirmar");
        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/factura")->assertRedirect();
        $f = Factura::firstOrFail();
        $this->actingAs($this->gestor)->post("/facturas/{$f->id}/validar");
        $this->actingAs($this->gestor)->post("/facturas/{$f->id}/abandonar", ['motivo' => 'Erro no preço']);
        $this->assertSame(Factura::ABANDONADA, $f->fresh()->estado);

        $this->actingAs($this->gestor)->post("/reservas/{$r->id}/factura")->assertRedirect();
        $this->assertSame(2, $r->facturas()->count());
    }
}
