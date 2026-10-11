<?php

namespace Tests\Feature;

use App\Models\Factura;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\FacturaFornecedorService;
use App\Services\FacturaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResultadosTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->administrador();
    }

    private function facturaValidada(Terceiro $cliente, string $data, string $preco): Factura
    {
        $s = app(FacturaService::class);
        $f = $s->criar(['terceiro_id' => $cliente->id, 'data' => $data, 'termos_pagamento' => 'pronto'], $this->admin);
        $s->adicionarLinha($f, ['descricao' => 'Montagem', 'quantidade' => '1', 'preco_unitario' => $preco, 'taxa_iva' => '16.00']);

        return $s->validar($f->fresh(), $this->admin);
    }

    private function compraValidada(string $data, string $preco): void
    {
        $fornecedor = Terceiro::factory()->create(['e_cliente' => false, 'e_fornecedor' => true]);
        $s = app(FacturaFornecedorService::class);
        $f = $s->criar(['terceiro_id' => $fornecedor->id, 'ref_fornecedor' => 'R-'.$preco, 'data' => $data], $this->admin);
        $s->adicionarLinha($f, ['descricao' => 'Lona', 'quantidade' => '1', 'preco_unitario' => $preco, 'taxa_iva' => '16.00']);
        $s->validar($f->fresh(), $this->admin);
    }

    public function test_so_a_gestao_ve_os_resultados(): void
    {
        $this->actingAs($this->utilizadorComPerfil('Gestor'), 'web')->get('/resultados')->assertOk();

        foreach (['Comercial', 'Financeiro', 'Armazém'] as $perfil) {
            $this->actingAs($this->utilizadorComPerfil($perfil), 'web')->get('/resultados')->assertForbidden();
        }
    }

    public function test_facturado_recebido_por_receber_compras_e_resultado(): void
    {
        $cliente = Terceiro::factory()->create(['nome' => 'Hotel Costa do Sol']);
        $hoje = now()->toDateString();
        $paga = $this->facturaValidada($cliente, $hoje, '1000');
        $this->facturaValidada($cliente, $hoje, '500');
        app(FacturaService::class)->registarPagamento($paga, ['data' => $hoje, 'metodo' => 'numerario', 'valor' => '1160'], $this->admin);
        $this->compraValidada($hoje, '300');
        // Fora do período: não conta
        $this->facturaValidada($cliente, now()->subYear()->toDateString(), '9999');

        $this->actingAs($this->admin, 'web')
            ->get('/resultados?periodo=mes')
            ->assertInertia(fn (Assert $p) => $p
                ->component('resultados/index')
                ->where('periodo.chave', 'mes')
                ->where('resumo.facturado', '1500.00')
                ->where('resumo.facturado_com_iva', '1740.00')
                ->where('resumo.n_facturas', 2)
                ->where('resumo.recebido', '1160.00')
                ->where('resumo.por_receber', '580.00')
                ->where('resumo.compras', '300.00')
                ->where('resumo.resultado', '1200.00')
                ->has('meses', 1)
                ->where('meses.0.valor', '1500.00')
                ->where('clientes.0.nome', 'Hotel Costa do Sol')
                ->where('categorias.0.categoria', 'Linhas livres')
                ->has('facturas', 2));

        $this->get('/resultados')->assertInertia(fn (Assert $p) => $p->where('periodo.chave', 'ano')->has('meses', 12));
        $this->get('/resultados?periodo=ano_anterior')->assertInertia(fn (Assert $p) => $p->where('resumo.facturado', '9999.00'));
    }

    public function test_datas_escolhidas_sao_validadas(): void
    {
        $this->actingAs($this->admin, 'web');

        $this->get('/resultados?periodo=datas')->assertSessionHasErrors(['de', 'ate']);
        $this->get('/resultados?periodo=datas&de=2026-05-10&ate=2026-05-01')->assertSessionHasErrors('ate');
        $this->get('/resultados?periodo=datas&de=2026-03-01&ate=2026-05-31')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->where('periodo.de', '2026-03-01')->where('periodo.ate', '2026-05-31')->has('meses', 3));
    }
}
