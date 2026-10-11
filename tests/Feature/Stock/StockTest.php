<?php

namespace Tests\Feature\Stock;

use App\Models\EncomendaFornecedor;
use App\Models\Inventario;
use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\EncomendaFornecedorService;
use App\Services\LinhasDocumento;
use App\Services\Stock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Etapa 3 do roadmap: movimentos de stock, disponibilidade por data e inventários */
class StockTest extends TestCase
{
    use RefreshDatabase;

    private User $armazem;

    protected function setUp(): void
    {
        parent::setUp();
        $this->armazem = $this->utilizadorComPerfil('Armazém');
    }

    private function produto(int $quantidade, array $atributos = []): Produto
    {
        $p = Produto::factory()->create(['em_aluguer' => true, 'preco_aluguer' => '120.00', ...$atributos]);
        app(Stock::class)->inicial($p, $quantidade, $this->armazem);

        return $p->fresh();
    }

    private function movimento(array $dados): TestResponse
    {
        return $this->actingAs($this->armazem)->post('/stock/movimentos', ['data' => today()->toDateString(), ...$dados]);
    }

    /** A soma dos movimentos dá sempre os totais guardados no produto */
    private function assertCoerente(Produto $p): void
    {
        $p->refresh();
        $this->assertSame($p->quantidade_total, (int) $p->movimentos()->sum('delta_total'));
        $this->assertSame($p->quantidade_fora, (int) $p->movimentos()->sum('delta_fora'));
        $this->assertSame($p->quantidade_fora, (int) $p->movimentos()->where('tipo', MovimentoStock::SAIDA)->sum('pendente'));
    }

    public function test_produto_novo_com_quantidade_inicial_e_a_ficha_nao_a_muda(): void
    {
        $this->actingAs($this->armazem)->post('/produtos', [
            'referencia' => 'CAD-TIFF', 'tipo' => 'produto', 'nome' => 'Cadeira Tiffany', 'taxa_iva' => '16.00', 'unidade' => 'un',
            'em_aluguer' => true, 'preco_aluguer' => '120', 'quantidade_total' => '250',
        ])->assertSessionHasNoErrors();

        $p = Produto::where('referencia', 'CAD-TIFF')->firstOrFail();
        $this->assertSame(250, $p->quantidade_total);
        $this->assertSame(MovimentoStock::INICIAL, $p->movimentos()->value('tipo'));

        $this->actingAs($this->armazem)->put("/produtos/{$p->id}", [
            'referencia' => 'CAD-TIFF', 'tipo' => 'produto', 'nome' => 'Cadeira Tiffany branca', 'taxa_iva' => '16.00', 'unidade' => 'un',
            'em_aluguer' => true, 'preco_aluguer' => '120', 'quantidade_total' => '999',
        ])->assertSessionHasNoErrors();
        $this->assertSame(250, $p->fresh()->quantidade_total);
        $this->assertCoerente($p);
    }

    public function test_saida_e_devolucao_contra_a_saida(): void
    {
        $p = $this->produto(100);
        $cliente = Terceiro::factory()->create();

        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 20, 'terceiro_id' => $cliente->id, 'devolucao_prevista' => today()->addDays(2)->toDateString(), 'motivo' => 'Casamento'])
            ->assertSessionHasNoErrors();
        $saida = MovimentoStock::where('tipo', 'saida')->firstOrFail();
        $this->assertSame([100, 20, 80], [$p->fresh()->quantidade_total, $p->fresh()->quantidade_fora, $p->fresh()->disponivelAgora()]);
        $this->assertSame(20, $saida->pendente);

        $this->movimento(['tipo' => 'devolucao', 'produto_id' => $p->id, 'saida_id' => $saida->id, 'quantidade' => 15])->assertSessionHasNoErrors();
        $this->assertSame(5, $saida->fresh()->pendente);
        $this->assertSame(5, $p->fresh()->quantidade_fora);
        $this->assertSame($cliente->id, MovimentoStock::where('tipo', 'devolucao')->value('terceiro_id'));

        // Não voltam mais peças do que as que saíram, e a devolução diz de que saída vem
        $this->movimento(['tipo' => 'devolucao', 'produto_id' => $p->id, 'saida_id' => $saida->id, 'quantidade' => 6])->assertSessionHasErrors('stock');
        $this->movimento(['tipo' => 'devolucao', 'produto_id' => $p->id, 'quantidade' => 5])->assertSessionHasErrors('saida_id');

        $this->movimento(['tipo' => 'devolucao', 'produto_id' => $p->id, 'saida_id' => $saida->id, 'quantidade' => 5])->assertSessionHasNoErrors();
        $this->assertSame(0, $p->fresh()->quantidade_fora);
        $this->assertCoerente($p);
    }

    public function test_nunca_fica_negativo(): void
    {
        $p = $this->produto(10);

        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 8])->assertSessionHasNoErrors();
        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 3])
            ->assertSessionHasErrors(['stock' => 'Só há 2 peça(s) de '.$p->referencia.' no armazém (8 de 10 estão alugadas).']);
        $this->movimento(['tipo' => 'abate', 'produto_id' => $p->id, 'quantidade' => 3, 'motivo' => 'Partidas'])->assertSessionHasErrors('stock');
        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 0])->assertSessionHasErrors('quantidade');
        $this->movimento(['tipo' => 'entrada', 'produto_id' => $p->id, 'quantidade' => 5, 'data' => today()->addDay()->toDateString()])->assertSessionHasErrors('data');

        $this->assertSame([10, 8], [$p->fresh()->quantidade_total, $p->fresh()->quantidade_fora]);
        $this->assertCoerente($p);
    }

    public function test_perdas_do_armazem_e_de_pecas_que_nao_voltaram(): void
    {
        $p = $this->produto(50);
        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 10])->assertSessionHasNoErrors();
        $saida = MovimentoStock::where('tipo', 'saida')->firstOrFail();

        $this->movimento(['tipo' => 'abate', 'produto_id' => $p->id, 'quantidade' => 2])->assertSessionHasErrors('motivo');
        $this->movimento(['tipo' => 'abate', 'produto_id' => $p->id, 'quantidade' => 2, 'motivo' => 'Não devolvidas', 'saida_id' => $saida->id])->assertSessionHasNoErrors();
        $this->assertSame([48, 8, 8], [$p->fresh()->quantidade_total, $p->fresh()->quantidade_fora, $saida->fresh()->pendente]);

        $this->movimento(['tipo' => 'abate', 'produto_id' => $p->id, 'quantidade' => 3, 'motivo' => 'Partidas na montagem'])->assertSessionHasNoErrors();
        $this->assertSame([45, 8], [$p->fresh()->quantidade_total, $p->fresh()->quantidade_fora]);
        $this->assertCoerente($p);
    }

    public function test_ajuste_conta_o_armazem_e_soma_as_alugadas(): void
    {
        $p = $this->produto(10);
        $this->movimento(['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 4])->assertSessionHasNoErrors();

        // No armazém deviam estar 6; contaram-se 5 → o total passa a 9 (5 + 4 alugadas)
        $this->movimento(['tipo' => 'ajuste', 'produto_id' => $p->id, 'quantidade' => 5])->assertSessionHasErrors('motivo');
        $this->movimento(['tipo' => 'ajuste', 'produto_id' => $p->id, 'quantidade' => 5, 'motivo' => 'Contagem'])
            ->assertSessionHasNoErrors()->assertSessionHas('sucesso', "Total de {$p->referencia} corrigido para 9.");
        $this->assertSame([9, 4], [$p->fresh()->quantidade_total, $p->fresh()->quantidade_fora]);

        $this->movimento(['tipo' => 'ajuste', 'produto_id' => $p->id, 'quantidade' => 5, 'motivo' => 'Contagem'])
            ->assertSessionHas('sucesso', 'A quantidade já estava certa; nada mudou.');
        $this->assertCoerente($p);
    }

    public function test_servicos_nao_tem_stock(): void
    {
        $servico = Produto::factory()->create(['tipo' => 'servico']);

        $this->movimento(['tipo' => 'entrada', 'produto_id' => $servico->id, 'quantidade' => 1])->assertSessionHasErrors('produto_id');
    }

    public function test_inventario_corrige_so_o_que_tem_diferenca(): void
    {
        $cadeiras = $this->produto(100);
        $mesas = $this->produto(20);
        $tendas = $this->produto(4);
        $this->movimento(['tipo' => 'saida', 'produto_id' => $cadeiras->id, 'quantidade' => 30])->assertSessionHasNoErrors();

        $this->actingAs($this->armazem)->get('/stock/inventarios/novo')->assertInertia(fn (Assert $pg) => $pg->component('stock/inventarios/novo')->has('produtos', 3));

        // Cadeiras: 68 no armazém + 30 alugadas = 98 (faltam 2); mesas certas; tendas não contadas
        $this->actingAs($this->armazem)->post('/stock/inventarios', [
            'contagens' => [$cadeiras->id => '68', $mesas->id => '20', $tendas->id => ''],
            'nota' => 'Fim do mês',
        ])->assertSessionHasNoErrors();

        $inventario = Inventario::firstOrFail();
        $this->assertSame(2, $inventario->produtos_contados);
        $this->assertSame(1, $inventario->diferencas);
        $this->assertSame([98, 20, 4], [$cadeiras->fresh()->quantidade_total, $mesas->fresh()->quantidade_total, $tendas->fresh()->quantidade_total]);
        $this->assertSame(-2, $inventario->linhas()->where('produto_id', $cadeiras->id)->value('diferenca'));
        $this->assertSame($inventario->id, MovimentoStock::where('tipo', 'ajuste')->value('origem_id'));

        $this->actingAs($this->armazem)->get("/stock/inventarios/{$inventario->id}")->assertInertia(fn (Assert $pg) => $pg
            ->component('stock/inventarios/mostrar')->has('inventario.linhas', 2)->where('inventario.linhas.0.diferenca', -2));
        $this->actingAs($this->armazem)->post('/stock/inventarios', ['contagens' => [$mesas->id => '']])->assertSessionHasErrors('stock');
        $this->assertCoerente($cadeiras);
    }

    public function test_recepcao_de_encomenda_da_entrada_e_reabrir_anula(): void
    {
        $cadeiras = $this->produto(10, ['preco_compra' => '900']);
        $transporte = Produto::factory()->create(['tipo' => 'servico']);
        $fornecedor = Terceiro::factory()->create(['e_cliente' => false, 'e_fornecedor' => true]);
        $servico = app(EncomendaFornecedorService::class);

        // Encomenda antiga (antes de as compras serem só de matérias-primas): ainda dá entrada das peças ao receber
        $e = $servico->criar(['terceiro_id' => $fornecedor->id, 'data' => today()->toDateString()], $this->armazem);
        $linhas = app(LinhasDocumento::class);
        $linhas->adicionar($e, ['produto_id' => $cadeiras->id, 'quantidade' => '40']);
        $linhas->adicionar($e, ['produto_id' => $transporte->id, 'quantidade' => '1']);
        $linhas->adicionar($e, ['descricao' => 'Tecido (metros)', 'quantidade' => '12.5', 'preco_unitario' => '300']);
        $e = $servico->encomendar($servico->validar($e->fresh(), $this->armazem), today()->toDateString(), 'email');

        $this->actingAs($this->armazem)->post("/encomendas-fornecedor/{$e->id}/receber")
            ->assertSessionHasNoErrors()->assertSessionHas('sucesso', 'Encomenda classificada como recebida. Entraram 40 peça(s) em stock.');
        $this->assertSame(50, $cadeiras->fresh()->quantidade_total);
        $entrada = MovimentoStock::where('tipo', 'entrada')->firstOrFail();
        $this->assertSame([EncomendaFornecedor::class, $e->id], [$entrada->origem_type, $entrada->origem_id]);

        // Reabrir (quem valida compras) anula a entrada; mas não se as peças já estiverem alugadas
        $gestor = $this->utilizadorComPerfil('Gestor');
        $this->movimento(['tipo' => 'saida', 'produto_id' => $cadeiras->id, 'quantidade' => 45])->assertSessionHasNoErrors();
        $this->actingAs($gestor)->post("/encomendas-fornecedor/{$e->id}/reabrir")->assertSessionHasErrors('encomenda');
        $this->assertSame(EncomendaFornecedor::RECEBIDA, $e->fresh()->estado);

        $saida = MovimentoStock::where('tipo', 'saida')->firstOrFail();
        $this->movimento(['tipo' => 'devolucao', 'produto_id' => $cadeiras->id, 'saida_id' => $saida->id, 'quantidade' => 45])->assertSessionHasNoErrors();
        $this->actingAs($gestor)->post("/encomendas-fornecedor/{$e->id}/reabrir")->assertSessionHasNoErrors();
        $this->assertSame(EncomendaFornecedor::ENCOMENDADA, $e->fresh()->estado);
        $this->assertSame(10, $cadeiras->fresh()->quantidade_total);

        // Receber outra vez volta a dar entrada (uma só vez)
        $this->actingAs($this->armazem)->post("/encomendas-fornecedor/{$e->id}/receber")->assertSessionHasNoErrors();
        $this->assertSame(50, $cadeiras->fresh()->quantidade_total);
        $this->assertCoerente($cadeiras);
    }

    public function test_disponibilidade_por_data(): void
    {
        $p = $this->produto(20, ['nome' => 'Cadeira Tiffany']);
        $stock = app(Stock::class);
        $stock->saida($p, 8, ['devolucao_prevista' => today()->addDays(2)->toDateString()], $this->armazem);
        $stock->saida($p, 5, [], $this->armazem); // sem data prevista: conta como fora
        $stock->saida($p, 3, ['data' => today()->subDays(3)->toDateString(), 'devolucao_prevista' => today()->subDay()->toDateString()], $this->armazem); // atrasada

        $livres = fn (int $de, int $ate) => $this->actingAs($this->armazem)
            ->get('/stock/disponibilidade?de='.today()->addDays($de)->toDateString().'&ate='.today()->addDays($ate)->toDateString())
            ->assertOk()->viewData('page')['props']['linhas'][0];

        $this->assertSame(['ocupado' => 16, 'disponivel' => 4], array_intersect_key($livres(0, 1), ['ocupado' => 0, 'disponivel' => 0]));
        // O dia previsto da devolução ainda conta como ocupado
        $this->assertSame(16, $livres(2, 2)['ocupado']);
        $this->assertSame(['ocupado' => 8, 'disponivel' => 12], array_intersect_key($livres(3, 5), ['ocupado' => 0, 'disponivel' => 0]));

        $this->actingAs($this->armazem)->get('/stock/disponibilidade?de='.today()->subDay()->toDateString())->assertSessionHasErrors('de');
    }

    public function test_permissoes(): void
    {
        $p = $this->produto(10);
        $comercial = $this->utilizadorComPerfil('Comercial');
        $financeiro = $this->utilizadorComPerfil('Financeiro');
        $montagem = $this->utilizadorComPerfil('Equipa de montagem');

        // A lista "Produtos e stock" abre a quem vê produtos e a quem só vê o stock (equipa de montagem)
        $this->actingAs($comercial)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg->where('resumo.pecas', 10));
        $this->actingAs($montagem)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg->where('produtos.data.0.disponivel', 10));
        $this->actingAs($montagem)->get("/produtos/{$p->id}")->assertOk();
        $this->actingAs($montagem)->get('/stock/disponibilidade')->assertOk();
        $this->actingAs($comercial)->post('/stock/movimentos', ['tipo' => 'saida', 'produto_id' => $p->id, 'quantidade' => 1, 'data' => today()->toDateString()])->assertForbidden();
        $this->actingAs($financeiro)->post('/stock/movimentos', ['tipo' => 'ajuste', 'produto_id' => $p->id, 'quantidade' => 1, 'motivo' => 'x', 'data' => today()->toDateString()])->assertForbidden();
        $this->actingAs($comercial)->get('/stock/inventarios/novo')->assertForbidden();

        $semStock = $this->utilizadorComPermissoes(['produtos.ver']);
        $this->actingAs($semStock)->get('/stock/movimentos')->assertForbidden();
        $this->actingAs($semStock)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg->where('resumo', null)->where('atrasadas', []));
        $this->actingAs($semStock)->get("/produtos/{$p->id}")->assertInertia(fn (Assert $pg) => $pg->where('stock', null));
    }

    public function test_paginas_e_ficha_do_produto(): void
    {
        $p = $this->produto(10);
        $cliente = Terceiro::factory()->create();
        app(Stock::class)->saida($p, 3, ['terceiro_id' => $cliente->id, 'data' => today()->subDays(2)->toDateString(), 'devolucao_prevista' => today()->subDay()->toDateString()], $this->armazem);

        // Produtos e stock numa só lista
        $this->actingAs($this->armazem)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg
            ->component('produtos/index')
            ->where('resumo.pecas', 10)->where('resumo.fora', 3)->where('resumo.atrasadas', 3)
            ->has('atrasadas', 1)
            ->where('produtos.data.0.total', 10)
            ->where('produtos.data.0.fora', 3)
            ->where('produtos.data.0.disponivel', 7));
        $this->actingAs($this->armazem)->get('/produtos?stock=atrasado')->assertInertia(fn (Assert $pg) => $pg->has('produtos.data', 1));
        $this->actingAs($this->armazem)->get('/produtos?stock=esgotado')->assertInertia(fn (Assert $pg) => $pg->has('produtos.data', 0));
        $this->actingAs($this->armazem)->get('/produtos?ordem=disponivel&dir=desc')->assertOk();
        // O endereço antigo do resumo leva à lista, com o mesmo filtro
        $this->actingAs($this->armazem)->get('/stock?situacao=atrasado')->assertRedirect('/produtos?stock=atrasado');
        $this->actingAs($this->armazem)->get('/stock/movimentos')->assertInertia(fn (Assert $pg) => $pg->component('stock/movimentos')->has('movimentos.data', 2));
        $this->actingAs($this->armazem)->get("/stock/movimentos?produto={$p->id}&tipo=saida")->assertInertia(fn (Assert $pg) => $pg->has('movimentos.data', 1)->where('produto.id', $p->id));
        $this->actingAs($this->armazem)->get('/stock/inventarios')->assertInertia(fn (Assert $pg) => $pg->component('stock/inventarios/index'));

        $this->actingAs($this->armazem)->get("/produtos/{$p->id}")->assertInertia(fn (Assert $pg) => $pg
            ->where('stock.total', 10)->where('stock.fora', 3)->where('stock.disponivel', 7)
            ->has('stock.saidas_abertas', 1)->where('stock.saidas_abertas.0.atrasada', true)
            ->has('stock.movimentos', 2)
            ->has('clientes', 1));

        $this->actingAs($this->armazem)->get('/painel')->assertInertia(fn (Assert $pg) => $pg
            ->where('caixas', fn ($caixas) => collect($caixas)->firstWhere('id', 'produtos')['linhas'][1]['alerta'] === '3 por devolver em atraso'));
    }

    public function test_produto_com_movimentos_nao_se_apaga(): void
    {
        $novo = $this->produto(5);
        $usado = $this->produto(5);
        app(Stock::class)->entrada($usado, 1, [], $this->armazem);

        $this->actingAs($this->armazem)->delete("/produtos/{$usado->id}")->assertSessionHas('erro');
        $this->assertDatabaseHas('produtos', ['id' => $usado->id]);

        // Só com a quantidade inicial ainda se pode apagar (foi engano a criar)
        $this->actingAs($this->armazem)->delete("/produtos/{$novo->id}")->assertRedirect('/produtos');
        $this->assertSame(0, MovimentoStock::where('produto_id', $novo->id)->count());
    }
}
