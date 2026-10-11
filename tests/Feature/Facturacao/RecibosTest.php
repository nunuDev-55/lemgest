<?php

namespace Tests\Feature\Facturacao;

use App\Models\ContaCliente;
use App\Models\Pagamento;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\FacturaService;
use App\Support\Extenso;
use App\Support\Permissoes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Recibo de cada pagamento recebido: a equipa imprime-o e o cliente vê-o na sua área (se o perfil Cliente deixar) */
class RecibosTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->administrador();
    }

    private function pagamento(Terceiro $cliente, string $preco = '2155.60'): Pagamento
    {
        $s = app(FacturaService::class);
        $f = $s->criar(['terceiro_id' => $cliente->id, 'data' => today()->toDateString(), 'termos_pagamento' => 'pronto'], $this->admin);
        $s->adicionarLinha($f, ['descricao' => 'Aluguer de sofás', 'quantidade' => '1', 'preco_unitario' => $preco, 'taxa_iva' => '16.00']);
        $f = $s->validar($f->fresh(), $this->admin);

        return $s->registarPagamento($f, ['data' => today()->toDateString(), 'metodo' => 'mpesa', 'valor' => '2500.50', 'numero_documento' => 'MP123'], $this->admin);
    }

    public function test_valor_por_extenso(): void
    {
        $this->assertSame('dois mil e quinhentos meticais e cinquenta centavos', Extenso::meticais('2500.50'));
        $this->assertSame('mil cento e sessenta meticais', Extenso::meticais('1160'));
        $this->assertSame('um milhão de meticais', Extenso::meticais('1000000'));
        $this->assertSame('um metical', Extenso::meticais('1'));
        $this->assertSame('vinte e um mil e um meticais', Extenso::meticais('21001'));
    }

    public function test_equipa_imprime_o_recibo(): void
    {
        $p = $this->pagamento(Terceiro::factory()->create(['nome' => 'Hotel Costa do Sol']));

        $this->actingAs($this->admin, 'web')->get("/pagamentos/{$p->id}/recibo")->assertInertia(fn (Assert $pg) => $pg
            ->component('pagamentos/recibo')
            ->where('recibo.numero', $p->numero)
            ->where('recibo.valor_extenso', 'dois mil e quinhentos meticais e cinquenta centavos')
            ->where('recibo.terceiro.nome', 'Hotel Costa do Sol')
            ->where('recibo.facturas.0.valor', '2500.50'));

        $semPagamentos = $this->utilizadorComPerfil('Armazém');
        $this->actingAs($semPagamentos, 'web')->get("/pagamentos/{$p->id}/recibo")->assertForbidden();
    }

    public function test_cliente_ve_os_seus_recibos_so_com_a_permissao(): void
    {
        $cliente = Terceiro::factory()->create();
        $meu = $this->pagamento($cliente);
        $alheio = $this->pagamento(Terceiro::factory()->create());
        $conta = ContaCliente::forceCreate([
            'nome' => 'Cliente', 'email' => 'cliente@exemplo.co.mz', 'telemovel' => '+258 84 000 0000', 'provincia' => 'MZ-MPM', 'cidade' => 'Maputo',
            'password' => 'senha-segura-1', 'estado' => ContaCliente::ACTIVA, 'terceiro_id' => $cliente->id,
        ]);
        Auth::guard('web')->logout();

        // Perfil Cliente de origem: sem facturas e recibos
        $this->actingAs($conta, 'cliente')->get("/conta/recibos/{$meu->id}")->assertRedirect('/conta');

        Role::findByName(Permissoes::CLIENTE, 'cliente')->givePermissionTo('conta.documentos');
        $this->get("/conta/recibos/{$meu->id}")->assertInertia(fn (Assert $pg) => $pg->component('pagamentos/recibo')->where('recibo.numero', $meu->numero));
        $this->get("/conta/recibos/{$alheio->id}")->assertNotFound();
        $this->get('/conta/facturas')->assertInertia(fn (Assert $pg) => $pg->has('recibos', 1)->where('recibos.0.id', $meu->id));
    }
}
