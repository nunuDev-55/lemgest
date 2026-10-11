<?php

namespace Tests\Feature\Facturacao;

use App\Models\Factura;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Models\User;
use App\Support\Dinheiro;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FacturasTest extends TestCase
{
    use RefreshDatabase;

    private User $financeiro;

    private Terceiro $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->financeiro = $this->utilizadorComPerfil('Financeiro');
        $this->cliente = Terceiro::factory()->create(['nome' => 'IKIGAI LDA', 'termos_pagamento' => '30d']);
    }

    private function criarRascunho(): Factura
    {
        $this->actingAs($this->financeiro)->post('/facturas', [
            'terceiro_id' => $this->cliente->id,
            'data' => '2026-05-25',
            'termos_pagamento' => '30d',
            'metodo_pagamento' => 'mpesa',
            'ref_cliente' => 'REQ-77',
        ])->assertSessionHasNoErrors();

        return Factura::latest('id')->firstOrFail();
    }

    private function linha(Factura $f, array $dados): void
    {
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/linhas", $dados)->assertSessionHasNoErrors();
    }

    public function test_calculo_da_linha_com_desconto_e_iva(): void
    {
        // 3 × 333,33 com 10% de desconto = 899,99 ; IVA 16% = 144,00
        $t = Dinheiro::linha('3', '333.33', '10', '16');
        $this->assertSame('899.99', $t['total_sem_iva']);
        $this->assertSame('144.00', $t['total_iva']);
        $this->assertSame('1043.99', $t['total']);
    }

    public function test_criar_rascunho_calcula_vencimento_pelos_termos(): void
    {
        $f = $this->criarRascunho();

        $this->assertSame(Factura::RASCUNHO, $f->estado);
        $this->assertNull($f->numero);
        $this->assertSame('(PROV'.$f->id.')', $f->referencia());
        $this->assertSame('2026-06-24', $f->data_vencimento->toDateString()); // 30 dias
    }

    public function test_linhas_actualizam_os_totais_como_na_factura_119(): void
    {
        $f = $this->criarRascunho();
        $almofada = Produto::factory()->create(['referencia' => 'ALM-01', 'nome' => 'Almofadas', 'preco' => '100.00']);

        $this->linha($f, ['produto_id' => $almofada->id, 'quantidade' => '200']);
        $this->linha($f, ['descricao' => 'Transporte', 'quantidade' => '2', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);

        $f->refresh();
        $this->assertSame('21000.00', $f->total_sem_iva);
        $this->assertSame('3360.00', $f->total_iva);
        $this->assertSame('24360.00', $f->total);
        $this->assertSame('ALM-01 - Almofadas', $f->linhas()->first()->descricao);
    }

    public function test_validar_atribui_numero_sequencial_e_bloqueia_alteracoes(): void
    {
        $f1 = $this->criarRascunho();
        $this->linha($f1, ['descricao' => 'Serviço', 'quantidade' => '1', 'preco_unitario' => '1000', 'taxa_iva' => '16.00']);
        $f2 = $this->criarRascunho();
        $this->linha($f2, ['descricao' => 'Serviço', 'quantidade' => '1', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);

        $this->actingAs($this->financeiro)->post("/facturas/{$f1->id}/validar")->assertSessionHasNoErrors();
        $this->actingAs($this->financeiro)->post("/facturas/{$f2->id}/validar")->assertSessionHasNoErrors();

        $this->assertSame('FT2026/0001', $f1->fresh()->numero);
        $this->assertSame('FT2026/0002', $f2->fresh()->numero);
        $this->assertSame(Factura::VALIDADA, $f1->fresh()->estado);

        // Validada: não aceita linhas novas, nem alterar, nem apagar
        $this->actingAs($this->financeiro)->post("/facturas/{$f1->id}/linhas", ['descricao' => 'Extra', 'quantidade' => '1', 'preco_unitario' => '10', 'taxa_iva' => '16.00'])
            ->assertSessionHasErrors('factura');
        $this->actingAs($this->financeiro)->delete("/facturas/{$f1->id}")->assertSessionHasErrors('factura');
        $this->assertSame('1160.00', $f1->fresh()->total);
    }

    public function test_nao_valida_factura_sem_linhas(): void
    {
        $f = $this->criarRascunho();

        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/validar")->assertSessionHasErrors('factura');
        $this->assertNull($f->fresh()->numero);
    }

    public function test_pagamento_parcial_e_depois_total_passa_a_paga(): void
    {
        $f = $this->criarRascunho();
        $this->linha($f, ['descricao' => 'Aluguer de sofá', 'quantidade' => '1', 'preco_unitario' => '1500', 'taxa_iva' => '16.00']);
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/validar");

        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'mpesa', 'valor' => '1000'])
            ->assertSessionHasNoErrors();
        $this->assertSame(Factura::VALIDADA, $f->fresh()->estado);
        $this->assertSame('740.00', $f->fresh()->emFalta());

        // Mais do que falta: recusado
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'numerario', 'valor' => '800'])
            ->assertSessionHasErrors('valor');

        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'numerario', 'valor' => '740,00'])
            ->assertSessionHasNoErrors();
        $this->assertSame(Factura::PAGA, $f->fresh()->estado);
        $this->assertDatabaseHas('pagamentos', ['numero' => 'PG'.now()->format('Y').'/0002', 'valor' => '740.00']);
    }

    public function test_abandonar_exige_motivo_e_nao_aceita_facturas_com_pagamentos(): void
    {
        $f = $this->criarRascunho();
        $this->linha($f, ['descricao' => 'Serviço', 'quantidade' => '1', 'preco_unitario' => '1000', 'taxa_iva' => '16.00']);
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/validar");

        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/abandonar", ['motivo' => ''])->assertSessionHasErrors('motivo');
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/abandonar", ['motivo' => 'Cliente desistiu do evento'])->assertSessionHasNoErrors();
        $this->assertSame(Factura::ABANDONADA, $f->fresh()->estado);

        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/reabrir")->assertSessionHasNoErrors();
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'mpesa', 'valor' => '100']);
        $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/abandonar", ['motivo' => 'Teste'])->assertSessionHasErrors('factura');
    }

    public function test_so_clientes_activos_podem_ser_facturados(): void
    {
        $fornecedor = Terceiro::factory()->fornecedor()->create();
        $encerrado = Terceiro::factory()->create(['activo' => false]);

        foreach ([$fornecedor, $encerrado] as $t) {
            $this->actingAs($this->financeiro)
                ->post('/facturas', ['terceiro_id' => $t->id, 'data' => '2026-05-25', 'termos_pagamento' => 'pronto'])
                ->assertSessionHasErrors('terceiro_id');
        }
    }

    public function test_comercial_cria_mas_nao_valida_nem_regista_pagamentos(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');
        $f = $this->criarRascunho();
        $this->linha($f, ['descricao' => 'Serviço', 'quantidade' => '1', 'preco_unitario' => '1000', 'taxa_iva' => '16.00']);

        $this->actingAs($comercial)->get("/facturas/{$f->id}")->assertOk();
        $this->actingAs($comercial)->post("/facturas/{$f->id}/validar")->assertForbidden();
        $this->actingAs($comercial)->get('/pagamentos')->assertForbidden();
    }

    public function test_paginas_da_facturacao_abrem(): void
    {
        $f = $this->criarRascunho();
        $this->linha($f, ['descricao' => 'Serviço', 'quantidade' => '2', 'preco_unitario' => '250', 'taxa_iva' => '5.00']);

        $this->actingAs($this->financeiro)->get('/facturacao')->assertRedirect('/facturas'); // a antiga área leva à lista
        $this->actingAs($this->financeiro)->get('/facturas?estado=rascunho')
            ->assertInertia(fn (Assert $p) => $p->component('facturas/index')->where('facturas.total', 1)->where('totais.total', '525.00'));
        $this->actingAs($this->financeiro)->get('/facturas/nova')->assertInertia(fn (Assert $p) => $p->component('facturas/criar'));
        $this->actingAs($this->financeiro)->get("/facturas/{$f->id}")
            ->assertInertia(fn (Assert $p) => $p->component('facturas/mostrar')->where('factura.total', '525.00')->has('factura.linhas', 1));
        $this->actingAs($this->financeiro)->get("/facturas/{$f->id}/imprimir")->assertInertia(fn (Assert $p) => $p->component('facturas/imprimir'));
        $this->actingAs($this->financeiro)->get('/pagamentos')->assertInertia(fn (Assert $p) => $p->component('pagamentos/index'));
    }

    public function test_numeracao_das_facturas_segue_as_datas(): void
    {
        $nova = function (string $data): Factura {
            $this->actingAs($this->financeiro)->post('/facturas', ['terceiro_id' => $this->cliente->id, 'data' => $data, 'termos_pagamento' => '30d'])
                ->assertSessionHasNoErrors();
            $f = Factura::latest('id')->firstOrFail();
            $this->linha($f, ['descricao' => 'Tenda 6x6', 'quantidade' => '1', 'preco_unitario' => '7500', 'taxa_iva' => '16.00']);

            return $f;
        };
        $validar = fn (Factura $f) => $this->actingAs($this->financeiro)->post("/facturas/{$f->id}/validar");

        $a = $nova('2025-06-10');
        $validar($a)->assertSessionHasNoErrors();

        // Data anterior à da última factura validada: recusa, e o número não se gasta
        $b = $nova('2025-06-09');
        $validar($b)->assertSessionHasErrors(['factura' => 'A data da factura (09/06/2025) não pode ser anterior à da última factura validada (FT2025/0001, de 10/06/2025): a numeração tem de seguir as datas. Mude a data para 10/06/2025 ou depois.']);
        $this->assertSame([Factura::RASCUNHO, null], [$b->fresh()->estado, $b->fresh()->numero]);

        // No mesmo dia passa, com o número seguinte (sem saltos)
        $c = $nova('2025-06-10');
        $validar($c)->assertSessionHasNoErrors();
        $this->assertSame('FT2025/0002', $c->fresh()->numero);

        // Cada ano é uma série: uma factura de 2026 não impede fechar 2025 com uma data posterior a Junho
        $d = $nova('2026-01-05');
        $validar($d)->assertSessionHasNoErrors();
        $e = $nova('2025-12-31');
        $validar($e)->assertSessionHasNoErrors();
        $this->assertSame(['FT2026/0001', 'FT2025/0003'], [$d->fresh()->numero, $e->fresh()->numero]);
    }
}
