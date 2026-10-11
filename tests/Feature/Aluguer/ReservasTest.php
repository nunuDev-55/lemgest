<?php

namespace Tests\Feature\Aluguer;

use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\Disponibilidade;
use App\Services\Stock;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Etapa 4 do roadmap: reservas de aluguer (pedido → confirmada → entregue → devolvida) */
class ReservasTest extends TestCase
{
    use RefreshDatabase;

    private User $comercial;

    private User $armazem;

    private Terceiro $cliente;

    private Produto $cadeiras;

    private Produto $transporte;

    protected function setUp(): void
    {
        parent::setUp();
        $this->comercial = $this->utilizadorComPerfil('Comercial');
        $this->armazem = $this->utilizadorComPerfil('Armazém');
        $this->cliente = Terceiro::factory()->create(['nome' => 'Casamento Mabunda', 'telemovel' => '+258 84 000 1111']);
        $this->cadeiras = Produto::factory()->create(['referencia' => 'CAD-TIFF', 'nome' => 'Cadeira Tiffany', 'em_venda' => false, 'preco' => '0', 'em_aluguer' => true, 'preco_aluguer' => '120.00']);
        app(Stock::class)->inicial($this->cadeiras, 100, $this->armazem);
        $this->transporte = Produto::factory()->create(['referencia' => 'TRANSP', 'tipo' => 'servico', 'nome' => 'Transporte', 'preco' => '500.00']);
    }

    private function dia(int $n): string
    {
        return today()->addDays($n)->toDateString();
    }

    /** Cria uma reserva (pedido) com cadeiras e transporte e devolve-a */
    private function reserva(int $cadeiras = 80, int $de = 30, int $ate = 30, array $extra = []): Reserva
    {
        $this->actingAs($this->comercial)->post('/reservas', [
            'terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia($de), 'data_fim_evento' => $this->dia($ate), ...$extra,
        ])->assertSessionHasNoErrors();
        $r = Reserva::latest('id')->firstOrFail();
        $this->linha($r, ['produto_id' => $this->cadeiras->id, 'quantidade' => (string) $cadeiras])->assertSessionHasNoErrors();
        $this->linha($r, ['produto_id' => $this->transporte->id, 'quantidade' => '1'])->assertSessionHasNoErrors();

        return $r->fresh();
    }

    private function linha(Reserva $r, array $dados): TestResponse
    {
        return $this->actingAs($this->comercial)->post("/reservas/{$r->id}/linhas", $dados);
    }

    private function livres(int $de, int $ate): int
    {
        return app(Disponibilidade::class)->noPeriodo(collect([$this->cadeiras->fresh()]), CarbonImmutable::parse($this->dia($de)), CarbonImmutable::parse($this->dia($ate)))[$this->cadeiras->id]['disponivel'];
    }

    public function test_criar_reserva_com_numero_e_datas_por_omissao(): void
    {
        $this->actingAs($this->comercial)->post('/reservas', ['terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia(30)])->assertSessionHasNoErrors();

        $r = Reserva::firstOrFail();
        $this->assertSame('AL'.now()->format('Y').'/0001', $r->numero);
        $this->assertSame(Reserva::PEDIDO, $r->estado);
        $this->assertSame([$this->dia(30), $this->dia(30), $this->dia(30), 1], [$r->data_fim_evento->toDateString(), $r->data_entrega->toDateString(), $r->data_recolha->toDateString(), $r->dias]);

        // Evento de 3 dias: cobra 3 dias por omissão
        $this->actingAs($this->comercial)->post('/reservas', ['terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia(30), 'data_fim_evento' => $this->dia(32), 'data_entrega' => $this->dia(29)])->assertSessionHasNoErrors();
        $this->assertSame(3, Reserva::latest('id')->value('dias'));

        $base = ['terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia(30)];
        $this->actingAs($this->comercial)->post('/reservas', [...$base, 'data_recolha' => $this->dia(29)])->assertSessionHasErrors('data_recolha');
        $this->actingAs($this->comercial)->post('/reservas', [...$base, 'data_entrega' => $this->dia(31)])->assertSessionHasErrors('data_entrega');
        $this->actingAs($this->comercial)->post('/reservas', [...$base, 'data_fim_evento' => $this->dia(29)])->assertSessionHasErrors('data_fim_evento');
    }

    public function test_linhas_cobram_quantidade_vezes_dias(): void
    {
        $r = $this->reserva(50, 30, 32); // 3 dias

        $linhas = $r->linhas()->orderBy('posicao')->get();
        $this->assertSame([3, 1], $linhas->pluck('dias')->all()); // material leva os dias da reserva; o transporte, 1
        $this->assertSame('18000.00', $linhas[0]->total_sem_iva); // 50 × 3 × 120
        $this->assertSame('18500.00', $r->total_sem_iva);

        $this->linha($r, ['produto_id' => $this->cadeiras->id, 'quantidade' => '2.5'])->assertSessionHasErrors('quantidade');

        // Mudar os dias da reserva muda as linhas de material com os dias antigos
        $this->actingAs($this->comercial)->put("/reservas/{$r->id}", [
            'terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia(30), 'data_fim_evento' => $this->dia(32), 'dias' => 2,
        ])->assertSessionHasNoErrors();
        $this->assertSame([2, 1], $r->linhas()->orderBy('posicao')->pluck('dias')->all());
        $this->assertSame('12500.00', $r->fresh()->total_sem_iva);

        // Cada linha pode ter os seus dias
        $this->actingAs($this->comercial)->put("/reservas/{$r->id}/linhas/{$linhas[0]->id}", [
            'descricao' => 'Cadeiras', 'quantidade' => '50', 'dias' => '1', 'preco_unitario' => '120', 'taxa_iva' => '16.00',
        ])->assertSessionHasNoErrors();
        $this->assertSame('6500.00', $r->fresh()->total_sem_iva);
    }

    public function test_pedido_nao_prende_e_confirmada_prende_o_material(): void
    {
        $a = $this->reserva(80, 30, 31);
        $this->assertSame(100, $this->livres(30, 31)); // pedido: nada preso

        $this->actingAs($this->comercial)->post("/reservas/{$a->id}/confirmar")->assertSessionHasNoErrors();
        $this->assertSame(Reserva::CONFIRMADA, $a->fresh()->estado);
        $this->assertSame(20, $this->livres(30, 31));
        $this->assertSame(20, $this->livres(31, 40)); // basta um dia em comum
        $this->assertSame(100, $this->livres(32, 40)); // depois da recolha, livres

        // Outra reserva nas mesmas datas com 30 cadeiras: faltam 10
        $b = $this->reserva(30, 31, 31);
        $this->actingAs($this->comercial)->get("/reservas/{$b->id}")->assertInertia(fn (Assert $pg) => $pg
            ->where('stock.'.$b->linhas()->where('produto_id', $this->cadeiras->id)->value('id').'.falta', 10));
        $this->actingAs($this->comercial)->post("/reservas/{$b->id}/confirmar")->assertSessionHasErrors('reserva');
        $this->assertSame(Reserva::PEDIDO, $b->fresh()->estado);

        // Uma confirmada não pode crescer além do que há
        $linhaA = $a->linhas()->where('produto_id', $this->cadeiras->id)->firstOrFail();
        $this->actingAs($this->comercial)->put("/reservas/{$a->id}/linhas/{$linhaA->id}", [
            'descricao' => 'Cadeiras', 'quantidade' => '120', 'preco_unitario' => '120', 'taxa_iva' => '16.00', 'dias' => '2',
        ])->assertSessionHasErrors('reserva');
        $this->assertSame('80.000', $linhaA->fresh()->quantidade);

        // Noutras datas, B confirma-se
        $c = $this->reserva(30, 40, 40);
        $this->actingAs($this->comercial)->post("/reservas/{$c->id}/confirmar")->assertSessionHasNoErrors();
    }

    public function test_entrega_e_devolucao_mexem_no_stock(): void
    {
        $r = $this->reserva(80, 30, 31);
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar")->assertSessionHasNoErrors();

        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/entregar")->assertSessionHasNoErrors();
        $r->refresh();
        $this->assertSame(Reserva::ENTREGUE, $r->estado);
        $this->assertSame(80, $this->cadeiras->fresh()->quantidade_fora);
        $saida = MovimentoStock::where('tipo', 'saida')->firstOrFail();
        $this->assertSame([Reserva::class, $r->id, $this->dia(31), $this->cliente->id], [$saida->origem_type, $saida->origem_id, $saida->devolucao_prevista->toDateString(), $saida->terceiro_id]);
        $this->assertSame($saida->id, $r->linhas()->where('produto_id', $this->cadeiras->id)->value('movimento_saida_id'));

        // Depois de sair, a reserva já não se altera
        $this->linha($r, ['produto_id' => $this->cadeiras->id, 'quantidade' => '1'])->assertSessionHasErrors('reserva');
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/cancelar")->assertSessionHasErrors('reserva');

        $linha = $r->linhas()->where('produto_id', $this->cadeiras->id)->value('id');
        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/devolucao", ['linhas' => [$linha => ['devolvidas' => 70]]])
            ->assertSessionHasNoErrors()->assertSessionHas('sucesso', 'Devolução registada. Ainda falta material por voltar.');
        $this->assertSame(Reserva::ENTREGUE, $r->fresh()->estado);
        $this->assertSame(10, $this->cadeiras->fresh()->quantidade_fora);

        // Mais do que o que falta: recusa
        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/devolucao", ['linhas' => [$linha => ['devolvidas' => 11]]])->assertSessionHasErrors('reserva');

        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/devolucao", ['linhas' => [$linha => ['devolvidas' => 8, 'perdidas' => 2]], 'nota' => 'Partidas'])
            ->assertSessionHas('sucesso', 'Devolução registada: o material voltou todo.');
        $this->assertSame(Reserva::DEVOLVIDA, $r->fresh()->estado);
        $this->assertSame([98, 0], [$this->cadeiras->fresh()->quantidade_total, $this->cadeiras->fresh()->quantidade_fora]);

        $this->actingAs($this->armazem)->get("/reservas/{$r->id}")->assertInertia(fn (Assert $pg) => $pg
            ->where('material.0.saiu', 80)->where('material.0.devolvidas', 78)->where('material.0.perdidas', 2)->where('material.0.por_voltar', 0));
    }

    public function test_entrega_respeita_o_que_esta_fisicamente_no_armazem(): void
    {
        $r = $this->reserva(80, 30, 30);
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar")->assertSessionHasNoErrors();
        // Saiu material que ainda não voltou (sem data prevista, conta como fora)
        app(Stock::class)->saida($this->cadeiras, 50, [], $this->armazem);

        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/entregar")->assertSessionHasErrors('reserva');
        $this->assertSame(Reserva::CONFIRMADA, $r->fresh()->estado);
        $this->assertSame(50, $this->cadeiras->fresh()->quantidade_fora);
    }

    public function test_cancelar_liberta_e_reabrir_volta_a_pedido(): void
    {
        $r = $this->reserva(80, 30, 30);
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar");
        $this->assertSame(20, $this->livres(30, 30));

        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/cancelar", ['motivo' => 'Evento adiado'])->assertSessionHasNoErrors();
        $this->assertSame([Reserva::CANCELADA, 'Evento adiado'], [$r->fresh()->estado, $r->fresh()->motivo_cancelamento]);
        $this->assertSame(100, $this->livres(30, 30));

        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/reabrir")->assertSessionHasNoErrors();
        $this->assertSame(Reserva::PEDIDO, $r->fresh()->estado);

        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar");
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/pedido")->assertSessionHasNoErrors();
        $this->assertSame(Reserva::PEDIDO, $r->fresh()->estado);
        $this->assertSame(100, $this->livres(30, 30));
    }

    public function test_permissoes(): void
    {
        $r = $this->reserva(10, 30, 30);
        $financeiro = $this->utilizadorComPerfil('Financeiro');
        $montagem = $this->utilizadorComPerfil('Equipa de montagem');

        $this->actingAs($this->armazem)->post('/reservas', ['terceiro_id' => $this->cliente->id, 'data_evento' => $this->dia(30)])->assertForbidden();
        $this->actingAs($this->armazem)->post("/reservas/{$r->id}/confirmar")->assertForbidden();
        $this->actingAs($financeiro)->get('/reservas')->assertOk();
        $this->actingAs($financeiro)->post("/reservas/{$r->id}/confirmar")->assertForbidden();

        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar")->assertSessionHasNoErrors();
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/entregar")->assertForbidden();
        $this->actingAs($montagem)->get("/reservas/{$r->id}/lista")->assertOk();
        $this->actingAs($montagem)->post("/reservas/{$r->id}/entregar")->assertSessionHasNoErrors();

        $semReservas = $this->utilizadorComPermissoes(['produtos.ver']);
        $this->actingAs($semReservas)->get('/reservas')->assertForbidden();
    }

    public function test_paginas_calendario_lista_e_produto(): void
    {
        $r = $this->reserva(80, 30, 31, ['local' => 'Salão Polana', 'tema' => 'Branco e dourado', 'transporte' => true]);
        $this->actingAs($this->comercial)->post("/reservas/{$r->id}/confirmar");
        $outra = $this->reserva(5, 2, 2);

        $this->actingAs($this->comercial)->get('/reservas')->assertInertia(fn (Assert $pg) => $pg
            ->component('reservas/index')->has('reservas.data', 2)->where('resumo.pedidos', 1));
        $this->actingAs($this->comercial)->get('/reservas?estado=confirmada&pesquisa=Polana')->assertInertia(fn (Assert $pg) => $pg->has('reservas.data', 1));
        $this->actingAs($this->comercial)->get('/reservas/nova')->assertInertia(fn (Assert $pg) => $pg->component('reservas/formulario'));
        $this->actingAs($this->comercial)->get("/reservas/{$r->id}/editar")->assertInertia(fn (Assert $pg) => $pg->where('reserva.tema', 'Branco e dourado'));
        $this->actingAs($this->comercial)->get("/reservas/{$r->id}")->assertInertia(fn (Assert $pg) => $pg
            ->component('reservas/mostrar')->where('reserva.transporte', true)->has('reserva.linhas', 2)->has('produtos'));

        $mes = today()->addDays(30)->format('Y-m');
        $this->actingAs($this->comercial)->get("/reservas/calendario?mes={$mes}")->assertInertia(fn (Assert $pg) => $pg
            ->component('reservas/calendario')->where('reservas', fn ($lista) => collect($lista)->pluck('id')->contains($r->id)));

        // Lista para a equipa: sem preços
        $this->actingAs($this->armazem)->get("/reservas/{$r->id}/lista")->assertInertia(fn (Assert $pg) => $pg
            ->component('reservas/lista')
            ->where('reserva.linhas.0.material', true)
            ->where('reserva.linhas.0', fn ($l) => ! collect($l)->has('preco_unitario') && ! collect($l)->has('total')));

        // Na ficha do produto: reservadas e próximas reservas
        $this->actingAs($this->armazem)->get("/produtos/{$this->cadeiras->id}")->assertInertia(fn (Assert $pg) => $pg
            ->where('stock.reservadas', 80)->has('stock.proximas_reservas', 2));

        // Painel: caixa das reservas
        $this->actingAs($this->comercial)->get('/painel')->assertInertia(fn (Assert $pg) => $pg
            ->where('caixas.0.id', 'reservas')->where('caixas.0.linhas.0.valor', 1));
        $this->assertSame($outra->id, Reserva::where('estado', 'pedido')->value('id'));
    }
}
