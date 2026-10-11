<?php

namespace Tests\Feature\Facturacao;

use App\Models\Factura;
use App\Models\NotaCredito;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\FacturaService;
use App\Services\NotaCreditoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotasCreditoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->administrador();
    }

    /** Factura validada de 1 160,00 MT: 2 × 500,00 + IVA 16% */
    private function facturaValidada(): Factura
    {
        $s = app(FacturaService::class);
        $cliente = Terceiro::factory()->create(['nome' => 'Hotel Polana']);
        $f = $s->criar(['terceiro_id' => $cliente->id, 'data' => now()->toDateString(), 'termos_pagamento' => '30d'], $this->admin);
        $s->adicionarLinha($f, ['descricao' => 'Cadeira Tiffany (aluguer)', 'quantidade' => '2', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);

        return $s->validar($f->fresh(), $this->admin);
    }

    private function pagar(Factura $f, string $valor): void
    {
        app(FacturaService::class)->registarPagamento($f, ['data' => now()->toDateString(), 'metodo' => 'mpesa', 'valor' => $valor], $this->admin);
    }

    public function test_nota_de_credito_total_liquida_factura_por_pagar(): void
    {
        $f = $this->facturaValidada();

        $this->actingAs($this->admin)
            ->post("/facturas/{$f->id}/nota-credito", ['motivo' => 'Anulação da factura', 'copiar_linhas' => true])
            ->assertRedirect();
        $nc = NotaCredito::firstOrFail();
        $this->assertSame('rascunho', $nc->estado);
        $this->assertSame('1160.00', (string) $nc->total);
        $this->assertNull($nc->numero);

        $this->post("/notas-credito/{$nc->id}/validar")->assertSessionHasNoErrors();

        $nc->refresh();
        $f->refresh();
        $ano = now()->format('Y');
        $this->assertSame("NC{$ano}/0001", $nc->numero);
        $this->assertSame(NotaCredito::FECHADA, $nc->estado);
        $this->assertSame('1160.00', (string) $nc->valor_abatido);
        $this->assertSame('0.00', (string) $nc->valor_reembolso);
        $this->assertSame(Factura::PAGA, $f->estado);
        $this->assertSame('1160.00', (string) $f->total_creditado);
        $this->assertSame('0.00', $f->emFalta());
        $this->assertSame('0.00', $f->creditavel());
    }

    public function test_nota_parcial_em_factura_paga_em_parte_abate_e_deixa_o_resto_por_reembolsar(): void
    {
        $f = $this->facturaValidada();
        $this->pagar($f, '1000'); // faltam 160,00

        $s = app(NotaCreditoService::class);
        $nc = $s->criarAPartirDe($f->fresh(), $this->admin, 'Devolução de material');
        // Devolveu só uma cadeira: 1 × 500 + IVA = 580,00
        $s->actualizarLinha($nc->linhas()->first(), ['descricao' => 'Cadeira Tiffany (aluguer)', 'quantidade' => '1', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);
        $nc = $s->validar($nc->fresh(), $this->admin);

        $f->refresh();
        $this->assertSame('580.00', (string) $nc->total);
        $this->assertSame('160.00', (string) $nc->valor_abatido);
        $this->assertSame('420.00', (string) $nc->valor_reembolso);
        $this->assertSame(NotaCredito::VALIDADA, $nc->estado);
        $this->assertTrue($nc->porReembolsar());
        $this->assertSame(Factura::PAGA, $f->estado);
        $this->assertSame('580.00', $f->creditavel());

        // Reembolso ao cliente fecha a nota
        $this->actingAs($this->admin)
            ->post("/notas-credito/{$nc->id}/reembolso", ['data' => now()->toDateString(), 'metodo' => 'mpesa', 'referencia' => 'MP-123'])
            ->assertSessionHasNoErrors();
        $this->assertSame(NotaCredito::FECHADA, $nc->fresh()->estado);
    }

    public function test_nao_se_credita_mais_do_que_a_factura(): void
    {
        $f = $this->facturaValidada();
        $s = app(NotaCreditoService::class);

        $primeira = $s->criarAPartirDe($f, $this->admin, 'Desconto concedido depois da factura');
        $s->actualizarLinha($primeira->linhas()->first(), ['descricao' => 'Desconto', 'quantidade' => '1', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);
        $s->validar($primeira->fresh(), $this->admin); // creditou 580, faltam 580

        // Segunda nota com todas as linhas (1 160) passa do que resta
        $segunda = $s->criarAPartirDe($f->fresh(), $this->admin, 'Anulação da factura');
        try {
            $s->validar($segunda->fresh(), $this->admin);
            $this->fail('Devia recusar uma nota maior do que o valor creditável.');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('maior do que o que ainda se pode creditar', $e->getMessage());
        }
        $this->assertNull($segunda->fresh()->numero);
    }

    public function test_regras_de_criacao_e_bloqueio(): void
    {
        $s = app(NotaCreditoService::class);

        // Rascunho de factura não leva nota de crédito
        $rascunho = app(FacturaService::class)->criar(['terceiro_id' => Terceiro::factory()->create()->id, 'data' => now()->toDateString()], $this->admin);
        $this->actingAs($this->admin)->post("/facturas/{$rascunho->id}/nota-credito", ['motivo' => 'Erro'])->assertSessionHasErrors('factura');

        // Um só rascunho de nota por factura
        $f = $this->facturaValidada();
        $nc = $s->criarAPartirDe($f, $this->admin, 'Erro de preço ou de quantidade na factura', copiarLinhas: false);
        $this->assertSame(0, $nc->linhas()->count());
        $this->post("/facturas/{$f->id}/nota-credito", ['motivo' => 'Outra'])->assertSessionHasErrors('factura');

        // Sem linhas não valida; com linha valida e fica bloqueada
        $this->post("/notas-credito/{$nc->id}/validar")->assertSessionHasErrors('nota');
        $s->adicionarLinha($nc, ['descricao' => 'Acerto de preço', 'quantidade' => '1', 'preco_unitario' => '100', 'taxa_iva' => '16.00']);
        $this->post("/notas-credito/{$nc->id}/validar")->assertSessionHasNoErrors();
        $this->post("/notas-credito/{$nc->id}/linhas", ['descricao' => 'Mais', 'quantidade' => '1', 'preco_unitario' => '1', 'taxa_iva' => '16.00'])
            ->assertSessionHasErrors('nota');
        $this->delete("/notas-credito/{$nc->id}")->assertSessionHasErrors('nota');

        // Factura com nota de crédito já não pode ser abandonada
        $this->post("/facturas/{$f->id}/abandonar", ['motivo' => 'Teste'])->assertSessionHasErrors('factura');
    }

    public function test_permissoes(): void
    {
        $f = $this->facturaValidada();
        $comercial = $this->utilizadorComPerfil('Comercial'); // cria rascunhos, não valida

        $this->actingAs($comercial)->post("/facturas/{$f->id}/nota-credito", ['motivo' => 'Erro'])->assertRedirect();
        $nc = NotaCredito::firstOrFail();
        $this->actingAs($comercial)->post("/notas-credito/{$nc->id}/validar")->assertForbidden();

        $semFacturas = $this->utilizadorComPerfil('Armazém');
        $this->actingAs($semFacturas)->get('/notas-credito')->assertForbidden();
        $this->actingAs($semFacturas)->get("/notas-credito/{$nc->id}")->assertForbidden();
    }

    public function test_paginas_e_valores_no_inicio_e_no_terceiro(): void
    {
        $f = $this->facturaValidada();
        $s = app(NotaCreditoService::class);
        $nc = $s->criarAPartirDe($f, $this->admin, 'Serviço não prestado ou cancelado');
        $s->actualizarLinha($nc->linhas()->first(), ['descricao' => 'Cadeira', 'quantidade' => '1', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);
        $s->validar($nc->fresh(), $this->admin);

        $this->actingAs($this->admin)->get('/notas-credito')->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('notas-credito/index')->where('notas.data.0.factura', $f->numero)->where('totais.total', '580.00'));
        $this->get("/notas-credito/{$nc->id}")->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('notas-credito/mostrar')->where('nota.factura.numero', $f->numero)->where('relacionados.0.tipo', 'factura'));
        $this->get("/notas-credito/{$nc->id}/imprimir")->assertOk()->assertInertia(fn (Assert $p) => $p->component('notas-credito/imprimir'));

        // Ficha da factura: creditado, em falta e o objecto relacionado
        $this->get("/facturas/{$f->id}")->assertInertia(fn (Assert $p) => $p
            ->where('factura.total_creditado', '580.00')
            ->where('factura.em_falta', '580.00')
            ->where('notaCredito.creditavel', '580.00')
            ->where('relacionados.0.tipo', 'nota_credito'));

        // Terceiro: facturado líquido (1 000 − 500) e por receber (1 160 − 580)
        $this->get("/terceiros/{$f->terceiro_id}")->assertInertia(fn (Assert $p) => $p
            ->where('resumo.facturado', '500.00')
            ->where('resumo.por_receber', '580.00'));

        // Início: restante a receber e o gráfico do mês descontam a nota
        $this->get('/painel')->assertInertia(fn (Assert $p) => $p
            ->where('caixas', fn ($caixas) => collect($caixas)->firstWhere('id', 'pagamentos')['linhas'][1]['valor'] === '580.00')
        );
        // Resultados do mês: o facturado desconta a nota
        $this->get('/resultados?periodo=mes')->assertInertia(fn (Assert $p) => $p->where('resumo.facturado', '500.00'));
    }

    public function test_numeracao_das_notas_de_credito_segue_as_datas(): void
    {
        $s = app(FacturaService::class);
        $notas = app(NotaCreditoService::class);
        $cliente = Terceiro::factory()->create();
        $f = $s->criar(['terceiro_id' => $cliente->id, 'data' => now()->subDays(10)->toDateString(), 'termos_pagamento' => '30d'], $this->admin);
        $s->adicionarLinha($f, ['descricao' => 'Cadeiras', 'quantidade' => '10', 'preco_unitario' => '500', 'taxa_iva' => '16.00']);
        $f = $s->validar($f->fresh(), $this->admin);

        $nota = function (int $diasAtras) use ($notas, $f) {
            $nc = $notas->criarAPartirDe($f->fresh(), $this->admin, 'Desconto', copiarLinhas: false, data: now()->subDays($diasAtras)->toDateString());
            $notas->adicionarLinha($nc, ['descricao' => 'Desconto', 'quantidade' => '1', 'preco_unitario' => '100', 'taxa_iva' => '16.00']);

            return $nc;
        };

        $primeira = $nota(2);
        $this->actingAs($this->admin)->post("/notas-credito/{$primeira->id}/validar")->assertSessionHasNoErrors();

        $anterior = $nota(5);
        $this->actingAs($this->admin)->post("/notas-credito/{$anterior->id}/validar")->assertSessionHasErrors('nota');
        $this->assertNull($anterior->fresh()->numero);
        $this->assertStringContainsString('não pode ser anterior à da última nota de crédito validada', session('errors')->first('nota'));

        // Como a mensagem indica: muda-se a data para depois da última e já se valida, com o número seguinte
        $this->actingAs($this->admin)->put("/notas-credito/{$anterior->id}", ['data' => now()->subDay()->toDateString(), 'motivo' => 'Desconto'])->assertSessionHasNoErrors();
        $this->actingAs($this->admin)->post("/notas-credito/{$anterior->id}/validar")->assertSessionHasNoErrors();
        $this->assertSame('NC'.now()->format('Y').'/0002', $anterior->fresh()->numero);
    }
}
