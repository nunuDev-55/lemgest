<?php

namespace Tests\Feature\Conta;

use App\Models\ContaCliente;
use App\Models\Terceiro;
use App\Models\User;
use App\Notifications\NovaSenhaCliente;
use App\Services\ContasCliente;
use App\Services\FacturaService;
use App\Services\ReservaService;
use App\Support\Permissoes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Etapa 6 do roadmap: contas de clientes (registo, aprovação pela LemServ, área do cliente) */
class ContasClienteTest extends TestCase
{
    use RefreshDatabase;

    private User $comercial;

    protected function setUp(): void
    {
        parent::setUp();
        $this->comercial = $this->utilizadorComPerfil('Comercial');
    }

    private function registo(array $alterar = []): array
    {
        return [
            'nome' => 'Nádia Cossa',
            'telemovel' => '84 901 2233',
            'email' => 'nadia@exemplo.co.mz',
            'nuit' => '',
            'provincia' => 'MZ-MPM',
            'cidade' => 'Maputo',
            'bairro' => 'Triunfo',
            'morada' => 'Casa 87',
            'password' => 'senha-segura-1',
            'password_confirmation' => 'senha-segura-1',
            ...$alterar,
        ];
    }

    /** Conta registada e aprovada (com ficha nova), pronta a entrar */
    private function contaActiva(array $alterar = []): ContaCliente
    {
        $this->post('/conta/registar', $this->registo($alterar))->assertSessionHasNoErrors();
        $conta = ContaCliente::latest('id')->firstOrFail();
        $this->actingAs($this->comercial, 'web')->post("/contas-clientes/{$conta->id}/aprovar")->assertSessionHasNoErrors();
        Auth::guard('web')->logout();

        return $conta->fresh();
    }

    private function entrar(string $email = 'nadia@exemplo.co.mz', string $senha = 'senha-segura-1')
    {
        return $this->post('/conta/entrar', ['email' => $email, 'password' => $senha]);
    }

    public function test_registo_fica_por_aprovar_e_nao_entra(): void
    {
        $this->get('/conta/registar')->assertInertia(fn (Assert $p) => $p->component('conta/registar')->has('provincias', 11));

        $this->post('/conta/registar', $this->registo())->assertRedirect('/conta/entrar')->assertSessionHas('status');
        $conta = ContaCliente::firstOrFail();
        $this->assertSame([ContaCliente::PENDENTE, null, '+258 84 901 2233'], [$conta->estado, $conta->terceiro_id, $conta->telemovel]);
        $this->assertSame(0, Terceiro::count()); // a ficha só nasce na aprovação

        $this->entrar()->assertSessionHasErrors(['email' => $conta->motivoSemAcesso()]);
        $this->assertGuest('cliente');

        // Dados inválidos
        $this->post('/conta/registar', $this->registo(['email' => 'outra@exemplo.co.mz', 'telemovel' => '21 123 456']))->assertSessionHasErrors('telemovel');
        $this->post('/conta/registar', $this->registo(['email' => 'nadia@exemplo.co.mz']))->assertSessionHasErrors('email');
        $this->post('/conta/registar', $this->registo(['email' => 'x@exemplo.co.mz', 'nuit' => '1234']))->assertSessionHasErrors('nuit');
    }

    public function test_equipa_nao_se_regista_como_cliente(): void
    {
        $this->post('/conta/registar', $this->registo(['email' => $this->comercial->email]))->assertSessionHasErrors('email');
        // e as credenciais da equipa não abrem a área do cliente
        $this->entrar($this->comercial->email, 'password')->assertSessionHasErrors('email');
    }

    public function test_aprovar_cria_ficha_nova_ou_liga_a_existente(): void
    {
        $conta = $this->contaActiva();
        $this->assertSame(ContaCliente::ACTIVA, $conta->estado);
        $ficha = $conta->terceiro;
        $this->assertTrue($ficha->e_cliente);
        $this->assertSame(['Nádia Cossa', '+258 84 901 2233', 'Casa 87, Triunfo'], [$ficha->nome, $ficha->telemovel, $ficha->morada]);
        $this->assertNotNull($ficha->codigo_cliente);

        // Pedido de alguém que já é cliente (mesmo telemóvel escrito de outra forma): sugere a ficha e liga-se a ela
        $hotel = Terceiro::factory()->create(['nome' => 'Hotel Costa do Sol', 'telemovel' => '+258 82 310 9988']);
        $this->post('/conta/registar', $this->registo(['nome' => 'Paulo Chissano', 'email' => 'paulo@hotel.co.mz', 'telemovel' => '823109988']));
        $paulo = ContaCliente::where('email', 'paulo@hotel.co.mz')->firstOrFail();

        $this->actingAs($this->comercial, 'web')->get('/contas-clientes')->assertInertia(fn (Assert $p) => $p
            ->component('terceiros/contas')
            ->where('filtros.estado', 'pendente')
            ->has('contas.data', 1)
            ->where('contas.data.0.sugestoes.0.id', $hotel->id));

        $this->actingAs($this->comercial, 'web')->post("/contas-clientes/{$paulo->id}/aprovar", ['terceiro_id' => $hotel->id])->assertSessionHasNoErrors();
        $this->assertSame($hotel->id, $paulo->fresh()->terceiro_id);
        $this->assertSame(2, Terceiro::count()); // não se criou ficha repetida

        $this->actingAs($this->comercial, 'web')->get("/terceiros/{$hotel->id}")->assertInertia(fn (Assert $p) => $p->where('contasLoja.0.email', 'paulo@hotel.co.mz'));
    }

    public function test_cliente_ve_so_o_que_e_seu(): void
    {
        $conta = $this->contaActiva();
        $outro = Terceiro::factory()->create();
        $reservas = app(ReservaService::class);
        $minha = $reservas->criar(['terceiro_id' => $conta->terceiro_id, 'data_evento' => today()->addDays(5)->toDateString(), 'data_fim_evento' => today()->addDays(5)->toDateString(), 'data_entrega' => today()->addDays(5)->toDateString(), 'data_recolha' => today()->addDays(5)->toDateString(), 'dias' => 1], $this->comercial);
        $alheia = $reservas->criar(['terceiro_id' => $outro->id, 'data_evento' => today()->addDays(5)->toDateString(), 'data_fim_evento' => today()->addDays(5)->toDateString(), 'data_entrega' => today()->addDays(5)->toDateString(), 'data_recolha' => today()->addDays(5)->toDateString(), 'dias' => 1], $this->comercial);

        $facturas = app(FacturaService::class);
        $admin = $this->administrador();
        $minhaFactura = $facturas->criar(['terceiro_id' => $conta->terceiro_id, 'data' => today()->toDateString(), 'termos_pagamento' => 'pronto'], $admin);
        $facturas->adicionarLinha($minhaFactura, ['descricao' => 'Aluguer', 'quantidade' => '1', 'preco_unitario' => '1000', 'taxa_iva' => '16.00']);
        $minhaFactura = $facturas->validar($minhaFactura->fresh(), $admin);
        $rascunho = $facturas->criar(['terceiro_id' => $conta->terceiro_id, 'data' => today()->toDateString(), 'termos_pagamento' => 'pronto'], $admin);
        $alheiaFactura = $facturas->criar(['terceiro_id' => $outro->id, 'data' => today()->toDateString(), 'termos_pagamento' => 'pronto'], $admin);
        Auth::guard('web')->logout();

        $this->entrar()->assertRedirect('/conta');
        $this->assertAuthenticatedAs($conta, 'cliente');

        // Perfil Cliente de origem: catálogo, reservar e ver as reservas; facturas e recibos desligados
        $this->get('/conta')->assertInertia(fn (Assert $p) => $p
            ->component('conta/inicio')->has('proximas', 1)->where('proximas.0.id', $minha->id)->where('porPagar', null)
            ->where('cliente.nome', 'Nádia Cossa')->where('cliente.permissoes', Permissoes::PERFIL_CLIENTE_INICIAL)->where('loja.nome', fn ($v) => $v !== null));
        $this->get('/conta/facturas')->assertRedirect('/conta');
        $this->get("/conta/facturas/{$minhaFactura->id}")->assertRedirect('/conta');

        // A LemServ liga as facturas no perfil Cliente
        Role::findByName(Permissoes::CLIENTE, 'cliente')->givePermissionTo('conta.documentos');
        $this->get('/conta')->assertInertia(fn (Assert $p) => $p->has('porPagar', 1));
        $this->get('/conta/reservas')->assertInertia(fn (Assert $p) => $p->has('reservas.data', 1));
        $this->get("/conta/reservas/{$minha->id}")->assertOk();
        $this->get("/conta/reservas/{$alheia->id}")->assertNotFound();
        $this->get('/conta/facturas')->assertInertia(fn (Assert $p) => $p->has('facturas.data', 1)->where('facturas.data.0.numero', $minhaFactura->numero));
        $this->get("/conta/facturas/{$minhaFactura->id}")->assertInertia(fn (Assert $p) => $p
            ->component('facturas/imprimir')->missing('factura.nota_privada')->missing('factura.validada_por'));
        $this->get("/conta/facturas/{$rascunho->id}")->assertNotFound();
        $this->get("/conta/facturas/{$alheiaFactura->id}")->assertNotFound();

        // O sistema interno continua fechado para o cliente
        $this->get('/painel')->assertRedirect('/login');
        $this->get('/reservas')->assertRedirect('/login');
    }

    public function test_dados_senha_e_sessao(): void
    {
        $conta = $this->contaActiva();
        $this->entrar();

        $this->get('/conta/dados')->assertInertia(fn (Assert $p) => $p->component('conta/dados')->where('conta.email', 'nadia@exemplo.co.mz'));
        $this->put('/conta/dados', ['nome' => 'Nádia M. Cossa', 'telemovel' => '+258 86 111 2222', 'provincia' => 'MZ-L', 'cidade' => 'Matola', 'bairro' => '', 'morada' => ''])
            ->assertSessionHasNoErrors();
        $this->assertSame(['Nádia M. Cossa', '+258 86 111 2222', 'Matola'], [$conta->fresh()->nome, $conta->fresh()->telemovel, $conta->fresh()->cidade]);

        $this->put('/conta/senha', ['senha_actual' => 'errada', 'password' => 'outra-senha-9', 'password_confirmation' => 'outra-senha-9'])->assertSessionHasErrors('senha_actual');
        $this->put('/conta/senha', ['senha_actual' => 'senha-segura-1', 'password' => 'outra-senha-9', 'password_confirmation' => 'outra-senha-9'])->assertSessionHasNoErrors();

        $this->post('/conta/sair')->assertRedirect('/conta/entrar');
        $this->assertGuest('cliente');
        $this->get('/conta')->assertRedirect('/conta/entrar');
        $this->entrar(senha: 'outra-senha-9')->assertRedirect('/conta');
    }

    public function test_suspensa_sai_no_pedido_seguinte_e_recusada_nao_entra(): void
    {
        $conta = $this->contaActiva();
        $this->entrar();
        $this->get('/conta')->assertOk();

        $this->actingAs($this->comercial, 'web')->post("/contas-clientes/{$conta->id}/suspender", ['motivo' => 'Pagamentos em atraso'])->assertSessionHasNoErrors();
        // Num pedido novo a conta é relida da base de dados (nos testes a guarda guarda-a em memória)
        Auth::guard('cliente')->forgetUser();
        $this->get('/conta')->assertRedirect('/conta/entrar')->assertSessionHas('erro');
        $this->assertGuest('cliente');

        $this->actingAs($this->comercial, 'web')->post("/contas-clientes/{$conta->id}/reactivar")->assertSessionHasNoErrors();
        Auth::guard('web')->logout();
        $this->entrar()->assertRedirect('/conta');

        // Recusada
        $this->post('/conta/sair');
        $this->post('/conta/registar', $this->registo(['email' => 'spam@exemplo.co.mz']));
        $spam = ContaCliente::where('email', 'spam@exemplo.co.mz')->firstOrFail();
        $this->actingAs($this->comercial, 'web')->post("/contas-clientes/{$spam->id}/recusar", ['motivo' => 'Dados falsos'])->assertSessionHasNoErrors();
        Auth::guard('web')->logout();
        $this->entrar('spam@exemplo.co.mz')->assertSessionHasErrors(['email' => 'O pedido de conta não foi aprovado. Motivo: Dados falsos. Para mais informações, fale com a LemServ.']);
    }

    public function test_nova_senha_por_email(): void
    {
        Notification::fake();
        $conta = $this->contaActiva();

        $this->post('/conta/recuperar', ['email' => 'nadia@exemplo.co.mz'])->assertSessionHas('status');
        $this->post('/conta/recuperar', ['email' => 'ninguem@exemplo.co.mz'])->assertSessionHas('status'); // não revela se existe

        $token = null;
        Notification::assertSentTo($conta, NovaSenhaCliente::class, function (NovaSenhaCliente $n, array $canais, ContaCliente $quem) use (&$token) {
            $token = $n->token;

            // A ligação leva à página dos clientes, não à da equipa
            return str_contains($n->toMail($quem)->actionUrl, '/conta/nova-senha/');
        });

        $this->post('/conta/nova-senha', ['token' => $token, 'email' => 'nadia@exemplo.co.mz', 'password' => 'senha-nova-77', 'password_confirmation' => 'senha-nova-77'])
            ->assertRedirect('/conta/entrar');
        $this->entrar(senha: 'senha-nova-77')->assertRedirect('/conta');
    }

    public function test_permissoes_e_painel(): void
    {
        $this->post('/conta/registar', $this->registo());
        $conta = ContaCliente::firstOrFail();

        $armazem = $this->utilizadorComPerfil('Armazém');
        $this->actingAs($armazem, 'web')->get('/contas-clientes')->assertForbidden();
        $this->actingAs($armazem, 'web')->post("/contas-clientes/{$conta->id}/aprovar")->assertForbidden();

        $this->actingAs($this->comercial, 'web')->get('/painel')->assertInertia(fn (Assert $p) => $p
            ->where('caixas', fn ($caixas) => collect(collect($caixas)->firstWhere('id', 'reservas')['linhas'])->firstWhere('label', 'Contas de clientes por aprovar')['valor'] === 1));

        // Uma sessão da equipa não abre a área do cliente
        $this->actingAs($this->comercial, 'web')->get('/conta')->assertRedirect('/conta/entrar');
    }

    public function test_perfil_cliente_em_perfis_e_permissoes(): void
    {
        $admin = $this->administrador();
        $cliente = Role::findByName(Permissoes::CLIENTE, 'cliente');

        $this->actingAs($admin, 'web')->get('/administracao/perfis')->assertInertia(fn (Assert $p) => $p
            ->where('perfis', fn ($perfis) => collect($perfis)->where('cliente', true)->pluck('name')->all() === ['Cliente'])
            ->has('catalogoCliente', 2));

        // Só aceita permissões do catálogo dos clientes
        $this->put("/administracao/perfis/{$cliente->id}", ['permissoes' => ['facturas.ver']])->assertSessionHasErrors('permissoes.0');
        $this->put("/administracao/perfis/{$cliente->id}", ['permissoes' => ['loja.catalogo']])->assertSessionHasNoErrors();
        $this->assertSame(['loja.catalogo'], Permissoes::doCliente());

        // Não se apaga e o nome não se repete na equipa
        $this->delete("/administracao/perfis/{$cliente->id}")->assertForbidden();
        $this->post('/administracao/perfis', ['name' => 'Cliente'])->assertSessionHasErrors('name');

        // Sem "Ver as suas reservas", a página de reservas leva ao início da conta
        $conta = $this->contaActiva();
        Auth::guard('web')->logout();
        $this->actingAs($conta, 'cliente')->get('/conta/reservas')->assertRedirect('/conta');
        $this->get('/conta')->assertInertia(fn (Assert $p) => $p->where('proximas', null)->where('porPagar', null));
    }

    public function test_logotipo_publico(): void
    {
        $this->get('/empresa/logotipo')->assertRedirect('/img/lemservices-logo.png');
    }

    public function test_registar_e_aprovar_logo_a_seguir(): void
    {
        // O estado "por aprovar" tem de estar na conta acabada de criar (não só na base de dados)
        $contas = app(ContasCliente::class);
        $conta = $contas->registar([
            'nome' => 'Lurdes Macamo', 'email' => 'lurdes@exemplo.co.mz', 'telemovel' => '+258 86 777 1234',
            'provincia' => 'MZ-L', 'cidade' => 'Matola', 'password' => 'senha-segura-1',
        ]);
        $this->assertSame(ContaCliente::PENDENTE, $conta->estado);
        $this->assertSame(ContaCliente::ACTIVA, $contas->aprovar($conta, $this->comercial)->estado);
    }
}
