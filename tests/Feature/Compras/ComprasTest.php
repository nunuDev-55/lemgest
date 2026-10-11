<?php

namespace Tests\Feature\Compras;

use App\Models\EncomendaFornecedor;
use App\Models\FacturaFornecedor;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\EncomendaFornecedorService;
use App\Services\FacturaFornecedorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ComprasTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Terceiro $fornecedor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->administrador();
        $this->fornecedor = Terceiro::factory()->create(['nome' => 'Tendas Matola Lda', 'e_cliente' => false, 'e_fornecedor' => true, 'termos_pagamento' => '30d']);
    }

    private function encomendaComLinhas(): EncomendaFornecedor
    {
        $s = app(EncomendaFornecedorService::class);
        $e = $s->criar(['terceiro_id' => $this->fornecedor->id, 'data' => now()->toDateString()], $this->admin);
        $lona = Produto::factory()->create(['referencia' => 'LONA-6X6', 'tipo' => Produto::MATERIA, 'preco' => '9000.00', 'preco_compra' => '4000.00', 'em_compra' => true]);
        $s->adicionarLinha($e, ['produto_id' => $lona->id, 'quantidade' => '2']);

        return $e->fresh();
    }

    public function test_so_se_compram_materias_primas(): void
    {
        $s = app(EncomendaFornecedorService::class);
        $e = $s->criar(['terceiro_id' => $this->fornecedor->id, 'data' => now()->toDateString()], $this->admin);
        $sofa = Produto::factory()->create(['tipo' => 'produto', 'em_compra' => true]);

        // Peças fabricadas não se compram; matérias-primas e linhas livres sim
        $this->actingAs($this->admin)->post("/encomendas-fornecedor/{$e->id}/linhas", ['produto_id' => $sofa->id, 'quantidade' => '2'])->assertSessionHasErrors('produto_id');
        $this->actingAs($this->admin)->post('/produtos', [
            'tipo' => 'materia', 'referencia' => 'NAPA-BR', 'nome' => 'Napa branca (metro)', 'unidade' => 'm', 'taxa_iva' => '16.00',
            'preco_compra' => '450', 'em_aluguer' => true, 'preco_aluguer' => '10', 'na_loja' => true, 'quantidade_total' => '30',
        ])->assertSessionHasNoErrors();
        $napa = Produto::where('referencia', 'NAPA-BR')->firstOrFail();
        // Uma matéria-prima só se compra: sem aluguer, sem loja e sem peças em stock
        $this->assertSame([true, false, false, 0, 0], [$napa->em_compra, $napa->em_aluguer, $napa->na_loja, $napa->quantidade_total, $napa->movimentos()->count()]);

        $this->post("/encomendas-fornecedor/{$e->id}/linhas", ['produto_id' => $napa->id, 'quantidade' => '25.5'])->assertSessionHasNoErrors();
        $this->post("/encomendas-fornecedor/{$e->id}/linhas", ['descricao' => 'Linha de coser', 'quantidade' => '3', 'preco_unitario' => '120', 'taxa_iva' => '16.00'])->assertSessionHasNoErrors();
        $this->assertSame(2, $e->linhas()->count());
        $this->get("/encomendas-fornecedor/{$e->id}")->assertInertia(fn (Assert $p) => $p->where('produtos', fn ($produtos) => collect($produtos)->pluck('referencia')->all() === ['NAPA-BR']));
    }

    public function test_encomenda_usa_preco_de_compra_e_segue_o_ciclo_ate_a_factura_paga(): void
    {
        $e = $this->encomendaComLinhas();
        // 2 × 4 000 (preço de compra, não o de venda) + IVA 16%
        $this->assertSame('8000.00', (string) $e->total_sem_iva);
        $this->assertSame('9280.00', (string) $e->total);

        $this->actingAs($this->admin)->post("/encomendas-fornecedor/{$e->id}/validar")->assertSessionHasNoErrors();
        $ano = now()->format('Y');
        $this->assertSame("EF{$ano}/0001", $e->fresh()->numero);

        $this->post("/encomendas-fornecedor/{$e->id}/encomendar", ['data' => now()->toDateString(), 'meio' => 'whatsapp'])->assertSessionHasNoErrors();
        $this->post("/encomendas-fornecedor/{$e->id}/receber")->assertSessionHasNoErrors();
        $this->assertSame(EncomendaFornecedor::RECEBIDA, $e->fresh()->estado);

        // Factura do fornecedor a partir da encomenda: mesmas linhas, nº do fornecedor obrigatório
        $this->post("/encomendas-fornecedor/{$e->id}/factura", [])->assertSessionHasErrors('ref_fornecedor');
        $this->post("/encomendas-fornecedor/{$e->id}/factura", ['ref_fornecedor' => 'FT 2026/245'])->assertRedirect();
        $f = FacturaFornecedor::firstOrFail();
        $this->assertSame('9280.00', (string) $f->total);
        $this->assertSame($e->id, $f->encomenda_fornecedor_id);
        $this->assertSame(now()->addDays(30)->toDateString(), $f->data_vencimento->toDateString());

        $this->post("/facturas-fornecedor/{$f->id}/validar")->assertSessionHasNoErrors();
        $f->refresh();
        $this->assertSame("FF{$ano}/0001", $f->numero);
        $this->assertTrue($e->fresh()->facturada);

        // Pagamento parcial e depois o resto
        $this->post("/facturas-fornecedor/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'transferencia', 'valor' => '5 000,00'])
            ->assertSessionHasNoErrors();
        $this->assertSame(FacturaFornecedor::VALIDADA, $f->fresh()->estado);
        $this->post("/facturas-fornecedor/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'transferencia', 'valor' => '9999'])
            ->assertSessionHasErrors('valor');
        $this->post("/facturas-fornecedor/{$f->id}/pagamento", ['data' => now()->toDateString(), 'metodo' => 'mpesa', 'valor' => '4280'])
            ->assertSessionHasNoErrors();

        $f->refresh();
        $this->assertSame(FacturaFornecedor::PAGA, $f->estado);
        $this->assertSame('9280.00', (string) $f->total_pago);
        $this->assertSame(["PF{$ano}/0001", "PF{$ano}/0002"], $f->pagamentos()->orderBy('numero')->pluck('numero')->all());
    }

    public function test_factura_directa_com_numero_do_fornecedor_unico(): void
    {
        $this->actingAs($this->admin);
        $dados = ['terceiro_id' => $this->fornecedor->id, 'ref_fornecedor' => 'FA-77', 'data' => now()->toDateString(), 'termos_pagamento' => 'pronto'];

        $this->post('/facturas-fornecedor', $dados)->assertRedirect();
        $this->post('/facturas-fornecedor', $dados)->assertSessionHasErrors('ref_fornecedor');

        // Outro fornecedor pode ter uma factura com o mesmo número
        $outro = Terceiro::factory()->create(['e_cliente' => false, 'e_fornecedor' => true]);
        $this->post('/facturas-fornecedor', [...$dados, 'terceiro_id' => $outro->id])->assertSessionHasNoErrors();

        // Um cliente que não é fornecedor é recusado
        $cliente = Terceiro::factory()->create(['e_cliente' => true, 'e_fornecedor' => false]);
        $this->post('/facturas-fornecedor', [...$dados, 'terceiro_id' => $cliente->id, 'ref_fornecedor' => 'X1'])->assertSessionHasErrors('terceiro_id');

        // Sem linhas não valida
        $f = FacturaFornecedor::where('terceiro_id', $this->fornecedor->id)->firstOrFail();
        $this->post("/facturas-fornecedor/{$f->id}/validar")->assertSessionHasErrors('factura');
    }

    public function test_regras_de_estado_da_encomenda(): void
    {
        $s = app(EncomendaFornecedorService::class);
        $e = $s->validar($this->encomendaComLinhas(), $this->admin);
        $this->actingAs($this->admin);

        // Validada: ainda não se recebe nem se factura
        $this->post("/encomendas-fornecedor/{$e->id}/receber")->assertSessionHasErrors('encomenda');
        $this->post("/encomendas-fornecedor/{$e->id}/factura", ['ref_fornecedor' => 'F1'])->assertSessionHasErrors('encomenda');

        // Voltar a rascunho mantém o número
        $this->post("/encomendas-fornecedor/{$e->id}/rascunho")->assertSessionHasNoErrors();
        $this->post("/encomendas-fornecedor/{$e->id}/validar")->assertSessionHasNoErrors();
        $this->assertSame($e->numero, $e->fresh()->numero);

        // Anulada e reaberta; com número já não se apaga
        $this->post("/encomendas-fornecedor/{$e->id}/anular")->assertSessionHasNoErrors();
        $this->post("/encomendas-fornecedor/{$e->id}/reabrir")->assertSessionHasNoErrors();
        $this->assertSame(EncomendaFornecedor::VALIDADA, $e->fresh()->estado);
        $this->post("/encomendas-fornecedor/{$e->id}/rascunho");
        $this->delete("/encomendas-fornecedor/{$e->id}")->assertSessionHasErrors('encomenda');
    }

    public function test_permissoes_por_perfil(): void
    {
        $e = app(EncomendaFornecedorService::class)->validar($this->encomendaComLinhas(), $this->admin);
        app(EncomendaFornecedorService::class)->encomendar($e, now()->toDateString(), 'email');

        // Comercial não vê compras
        $this->actingAs($this->utilizadorComPerfil('Comercial'))->get('/encomendas-fornecedor')->assertForbidden();

        // Armazém recebe, mas não valida nem paga
        $armazem = $this->utilizadorComPerfil('Armazém');
        $this->actingAs($armazem)->get('/encomendas-fornecedor')->assertOk();
        $this->actingAs($armazem)->post("/encomendas-fornecedor/{$e->id}/receber")->assertSessionHasNoErrors();
        $this->actingAs($armazem)->post("/encomendas-fornecedor/{$e->id}/anular")->assertForbidden();

        $f = app(FacturaFornecedorService::class)->criarAPartirDe($e->fresh(), 'R-1', $this->admin);
        $f = app(FacturaFornecedorService::class)->validar($f, $this->admin);
        $this->actingAs($armazem)->get("/facturas-fornecedor/{$f->id}/pagamento")->assertForbidden();

        // Financeiro paga
        $this->actingAs($this->utilizadorComPerfil('Financeiro'))->get("/facturas-fornecedor/{$f->id}/pagamento")->assertOk();
    }

    public function test_paginas_abrem_e_resumos(): void
    {
        $e = app(EncomendaFornecedorService::class)->validar($this->encomendaComLinhas(), $this->admin);
        app(EncomendaFornecedorService::class)->encomendar($e, now()->toDateString(), 'email');
        $f = app(FacturaFornecedorService::class)->validar(app(FacturaFornecedorService::class)->criarAPartirDe($e->fresh(), 'R-9', $this->admin), $this->admin);

        $this->actingAs($this->admin);
        $this->get('/compras')->assertRedirect('/encomendas-fornecedor'); // a antiga área leva à lista
        $this->get('/painel')->assertInertia(fn (Assert $p) => $p->where('caixas', fn ($caixas) => collect($caixas)->firstWhere('id', 'compras')['linhas'][1]['valor'] === 1));
        $this->get('/encomendas-fornecedor')->assertOk()->assertInertia(fn (Assert $p) => $p->component('encomendas-fornecedor/index'));
        $this->get('/encomendas-fornecedor/nova')->assertOk();
        $this->get("/encomendas-fornecedor/{$e->id}")->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('encomendas-fornecedor/mostrar')->where('relacionados.0.tipo', 'factura_fornecedor'));
        $this->get("/encomendas-fornecedor/{$e->id}/imprimir")->assertOk()->assertInertia(fn (Assert $p) => $p->component('encomendas-fornecedor/imprimir'));
        $this->get('/facturas-fornecedor')->assertOk()->assertInertia(fn (Assert $p) => $p->component('facturas-fornecedor/index')->where('totais.por_pagar', '9280.00'));
        $this->get('/facturas-fornecedor/nova')->assertOk();
        $this->get("/facturas-fornecedor/{$f->id}")->assertOk()->assertInertia(fn (Assert $p) => $p->component('facturas-fornecedor/mostrar'));
        $this->get('/pagamentos-fornecedor')->assertOk()->assertInertia(fn (Assert $p) => $p->component('pagamentos-fornecedor/index'));

        // Separador "Fornecedor" na ficha do terceiro e caixa no Início
        $this->get("/terceiros/{$this->fornecedor->id}")
            ->assertInertia(fn (Assert $p) => $p->where('fornecedor.resumo.por_pagar', '9280.00')->where('fornecedor.facturas.0.ref_fornecedor', 'R-9'));
        $this->get('/painel')->assertInertia(fn (Assert $p) => $p->where('caixas', fn ($caixas) => collect($caixas)->contains('id', 'compras')));
    }
}
