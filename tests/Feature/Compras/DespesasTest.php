<?php

namespace Tests\Feature\Compras;

use App\Models\Despesa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Despesas do dia-a-dia: com as compras de matéria-prima, são os gastos dos Resultados */
class DespesasTest extends TestCase
{
    use RefreshDatabase;

    private function despesa(array $alterar = []): array
    {
        return [
            'data' => today()->toDateString(),
            'categoria' => 'combustivel',
            'descricao' => 'Gasóleo da carrinha',
            'valor' => '2 500,50',
            'metodo' => 'mpesa',
            ...$alterar,
        ];
    }

    public function test_registar_alterar_e_apagar(): void
    {
        $financeiro = $this->utilizadorComPerfil('Financeiro');

        $this->actingAs($financeiro, 'web')->post('/despesas', $this->despesa())->assertSessionHasNoErrors();
        $d = Despesa::firstOrFail();
        $this->assertSame(['2500.50', $financeiro->id], [(string) $d->valor, $d->criado_por]);

        $this->get('/despesas')->assertInertia(fn (Assert $p) => $p
            ->component('despesas/index')->has('despesas.data', 1)->where('total', '2500.50')
            ->where('despesas.data.0.categoria_nome', 'Combustível e transporte'));
        $this->get('/despesas?categoria=renda')->assertInertia(fn (Assert $p) => $p->has('despesas.data', 0)->where('total', '0.00'));

        $this->put("/despesas/{$d->id}", $this->despesa(['valor' => '3000', 'categoria' => 'manutencao']))->assertSessionHasNoErrors();
        $this->assertSame(['3000.00', 'manutencao'], [(string) $d->fresh()->valor, $d->fresh()->categoria]);

        $this->delete("/despesas/{$d->id}")->assertSessionHasNoErrors();
        $this->assertDatabaseCount('despesas', 0);
        $this->assertDatabaseHas('activity_log', ['log_name' => 'despesas', 'description' => 'Despesa apagada']);
    }

    public function test_validacao(): void
    {
        $this->actingAs($this->administrador(), 'web');

        $this->post('/despesas', $this->despesa(['valor' => '0']))->assertSessionHasErrors('valor');
        $this->post('/despesas', $this->despesa(['data' => today()->addDay()->toDateString()]))->assertSessionHasErrors('data');
        $this->post('/despesas', $this->despesa(['categoria' => 'ferias', 'metodo' => 'cheque-voador', 'descricao' => '']))
            ->assertSessionHasErrors(['categoria', 'metodo', 'descricao']);
        $this->assertDatabaseCount('despesas', 0);
    }

    public function test_permissoes(): void
    {
        $comercial = $this->utilizadorComPerfil('Comercial');
        $this->actingAs($comercial, 'web')->get('/despesas')->assertForbidden();
        $this->post('/despesas', $this->despesa())->assertForbidden();

        $gestor = $this->utilizadorComPerfil('Gestor');
        $this->actingAs($gestor, 'web')->get('/despesas')->assertOk();
        $this->post('/despesas', $this->despesa())->assertSessionHasNoErrors();
    }
}
