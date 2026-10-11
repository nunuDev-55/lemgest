<?php

namespace Tests\Feature;

use App\Models\Factura;
use App\Models\Terceiro;
use App\Services\FacturaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InicioTest extends TestCase
{
    use RefreshDatabase;

    private function facturaValidada(Terceiro $cliente, string $data, string $preco): Factura
    {
        $admin = $this->administrador();
        $s = app(FacturaService::class);
        $f = $s->criar(['terceiro_id' => $cliente->id, 'data' => $data, 'termos_pagamento' => 'pronto'], $admin);
        $s->adicionarLinha($f, ['descricao' => 'Serviço', 'quantidade' => '1', 'preco_unitario' => $preco, 'taxa_iva' => '16.00']);

        return $s->validar($f->fresh(), $admin);
    }

    public function test_vista_global_conta_facturas_em_atraso(): void
    {
        $cliente = Terceiro::factory()->create(['nome' => 'IKIGAI LDA']);
        $this->facturaValidada($cliente, now()->subDays(40)->toDateString(), '1000'); // vencida (pronto pagamento)
        $this->facturaValidada($cliente, now()->toDateString(), '500');

        $this->actingAs($this->administrador())
            ->get('/painel')
            ->assertInertia(fn (Assert $p) => $p
                ->component('dashboard')
                ->where('emAtraso', 1)
                ->where('caixas.0.id', 'reservas')
                ->where('caixas.1.id', 'orcamentos')
                ->where('caixas.2.id', 'facturas')
                ->where('caixas.2.linhas.1.valor', 2)
                ->where('caixas.2.linhas.1.alerta', '1 em atraso')
                ->missing('grafico') // passou para os Resultados (só a gestão)
                ->where('naoPagas.total', '1740.00')
                ->where('devedores.0.nome', 'IKIGAI LDA'));
    }

    public function test_cada_um_so_ve_as_caixas_dos_seus_modulos(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)
            ->get('/painel')
            ->assertInertia(fn (Assert $p) => $p
                ->where('caixas', fn ($caixas) => collect($caixas)->pluck('id')->all() === ['reservas', 'produtos', 'compras'])
                ->where('naoPagas', null)
                ->missing('ultimosClientes')
                ->missing('estatisticas'));
    }

    public function test_login_anterior_e_data_da_senha(): void
    {
        $user = $this->utilizadorComPerfil('Comercial', ['email' => 'ana@lemserv.co.mz']);

        $this->post('/login', ['email' => 'ana@lemserv.co.mz', 'password' => 'password']);
        $this->post('/logout');
        $this->post('/login', ['email' => 'ana@lemserv.co.mz', 'password' => 'password']);

        $this->get('/painel')->assertInertia(fn (Assert $p) => $p
            ->where('login.nome', $user->name)
            ->whereNot('login.anterior', null)
            ->whereNot('login.senhaAlterada', null));
    }
}
