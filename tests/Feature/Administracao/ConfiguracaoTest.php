<?php

namespace Tests\Feature\Administracao;

use App\Models\Terceiro;
use App\Services\Numeracao;
use App\Services\OrcamentoService;
use App\Support\Definicoes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class ConfiguracaoTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function dadosEmpresa(array $alteracoes = []): array
    {
        return [
            'nome' => 'Lemservicos SU, Lda',
            'nome_comercial' => 'LemServ',
            'forma_juridica' => 'su_lda',
            'nuit' => '400 123 456',
            'nuel' => '101234567',
            'capital_social' => '20 000,00 MT',
            'actividade' => '',
            'morada' => 'Matola G',
            'cidade' => 'Matola',
            'provincia' => 'MZ-L',
            'pais' => 'MZ',
            'telefone' => '+258 84 122 1986',
            'telemovel' => '',
            'email' => 'lemservicos@gmail.com',
            'website' => '',
            ...$alteracoes,
        ];
    }

    public function test_pagina_da_empresa_mostra_os_valores_iniciais(): void
    {
        $this->actingAs($this->administrador())
            ->get('/administracao/configuracao/empresa')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('administracao/configuracao/empresa')
                ->where('empresa.nome', 'Lemservicos SU, Lda')
                ->where('empresa.provincia', 'MZ-L')
                ->where('empresa.nuit', '')
                ->where('logotipo.proprio', false)
                ->where('logotipo.url', '/img/lemservices-logo.png'));
    }

    public function test_guardar_empresa_normaliza_nuit_e_regista_na_auditoria(): void
    {
        $this->actingAs($this->administrador())
            ->post('/administracao/configuracao/empresa', $this->dadosEmpresa())
            ->assertSessionHasNoErrors()
            ->assertSessionHas('sucesso', 'Dados da empresa guardados.');

        $definicoes = app(Definicoes::class);
        $this->assertSame('400123456', $definicoes->obter('empresa.nuit'));
        $this->assertSame([], $definicoes->emFalta());
        $this->assertSame('Sociedade unipessoal por quotas (SU, Lda)', $definicoes->empresa()['forma_juridica']);
        $this->assertSame('Maputo Província', $definicoes->empresa()['provincia']);

        $registo = Activity::where('log_name', 'configuracao')->latest('id')->first();
        $this->assertSame('Dados da empresa alterados', $registo->description);
        $this->assertSame('400123456', $registo->properties['attributes']['nuit']);
        $this->assertNull($registo->properties['old']['nuit']);
        // O que não mudou não aparece na auditoria
        $this->assertArrayNotHasKey('nome', $registo->properties['attributes']);

        // Gravar outra vez sem mudanças não cria registo novo
        $this->post('/administracao/configuracao/empresa', $this->dadosEmpresa())->assertSessionHas('sucesso', 'Nada foi alterado.');
        $this->assertSame(1, Activity::where('log_name', 'configuracao')->count());
    }

    public function test_validacao_dos_dados_da_empresa(): void
    {
        $this->actingAs($this->administrador())
            ->post('/administracao/configuracao/empresa', $this->dadosEmpresa(['nome' => '', 'nuit' => '12345', 'provincia' => 'XX']))
            ->assertSessionHasErrors(['nome', 'nuit', 'provincia']);
    }

    public function test_so_quem_tem_permissao_entra_na_configuracao(): void
    {
        $gestor = $this->utilizadorComPerfil('Gestor');

        $this->actingAs($gestor)->get('/administracao/configuracao/empresa')->assertForbidden();
        $this->actingAs($gestor)->post('/administracao/configuracao/empresa', $this->dadosEmpresa())->assertForbidden();
        $this->actingAs($gestor)->get('/administracao/configuracao/documentos')->assertForbidden();
        $this->actingAs($gestor)->get('/administracao/configuracao/numeracao')->assertForbidden();

        $comPermissao = $this->utilizadorComPermissoes(['configuracao.gerir']);
        $this->actingAs($comPermissao)->get('/administracao/configuracao/numeracao')->assertOk();
    }

    public function test_logotipo_carregado_substitui_o_anterior_e_so_aceita_imagens(): void
    {
        Storage::fake('local');
        $this->actingAs($this->administrador());

        $this->post('/administracao/configuracao/empresa', $this->dadosEmpresa(['logotipo' => UploadedFile::fake()->image('logo.png', 600, 300)]))
            ->assertSessionHasNoErrors();
        $primeiro = app(Definicoes::class)->obter('empresa.logotipo');
        Storage::disk('local')->assertExists($primeiro);
        $this->get('/empresa/logotipo')->assertOk();

        // Um segundo logótipo apaga o primeiro
        $this->post('/administracao/configuracao/empresa', $this->dadosEmpresa(['logotipo' => UploadedFile::fake()->image('novo.jpg', 400, 400)]))
            ->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($primeiro);

        // SVG e ficheiros que não são imagem são recusados
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->post('/administracao/configuracao/empresa', $this->dadosEmpresa(['logotipo' => $svg]))->assertSessionHasErrors('logotipo');

        // Voltar ao original
        $segundo = app(Definicoes::class)->obter('empresa.logotipo');
        $this->post('/administracao/configuracao/empresa', $this->dadosEmpresa(['remover_logotipo' => true]))->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($segundo);
        $this->get('/empresa/logotipo')->assertRedirect('/img/lemservices-logo.png');
    }

    public function test_documentos_impressos_usam_os_dados_e_textos_configurados(): void
    {
        $admin = $this->administrador();
        $this->actingAs($admin)->post('/administracao/configuracao/empresa', $this->dadosEmpresa())->assertSessionHasNoErrors();
        $this->put('/administracao/configuracao/documentos', [
            'dados_pagamento' => 'M-Pesa: conta da empresa',
            'rodape_factura' => '',
            'rodape_orcamento' => 'Válido mediante adjudicação.',
            'rodape_encomenda' => '',
            'validade_orcamento' => 15,
            'transporte_minimo' => '3 500,00',
            'transporte_maximo' => '6000',
        ])->assertSessionHasNoErrors();
        $this->assertSame(['minimo' => '3500.00', 'maximo' => '6000.00'], app(Definicoes::class)->transporte());
        $this->put('/administracao/configuracao/documentos', ['validade_orcamento' => 15, 'transporte_minimo' => '5000', 'transporte_maximo' => '4000'])
            ->assertSessionHasErrors('transporte_maximo');

        $cliente = Terceiro::factory()->create();
        $this->get("/orcamentos/novo?terceiro={$cliente->id}")
            ->assertInertia(fn (Assert $p) => $p->where('validadeOmissao', 15));

        $orcamento = app(OrcamentoService::class)->criar(['terceiro_id' => $cliente->id, 'data' => now()->toDateString()], $admin);
        $this->assertSame(15, $orcamento->validade_dias);

        $this->get("/orcamentos/{$orcamento->id}/imprimir")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('documentos/imprimir')
                ->where('empresa.nuit', '400123456')
                ->where('empresa.nuel', '101234567')
                ->where('empresa.dados_pagamento', 'M-Pesa: conta da empresa')
                ->where('empresa.logotipo', '/img/lemservices-logo.png')
                ->where('rodape', 'Válido mediante adjudicação.'));
    }

    public function test_numeracao_mostra_ultimo_e_proximo_numero(): void
    {
        $ano = (int) now()->format('Y');
        DB::table('numeracoes')->insert(['serie' => 'factura', 'ano' => $ano, 'ultimo' => 7, 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($this->administrador())
            ->get('/administracao/configuracao/numeracao')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('administracao/configuracao/numeracao')
                ->where('series.0.serie', 'factura')
                ->where('series.0.quantos', 7)
                ->where('series.0.ultimo', Numeracao::formatar('factura', $ano, 7))
                ->where('series.0.proximo', "FT{$ano}/0008")
                ->where('series.2.ultimo', null)
                ->where('series.2.proximo', "OR{$ano}/0001"));
    }

    public function test_inicio_avisa_o_administrador_enquanto_falta_o_nuit(): void
    {
        $admin = $this->administrador();

        $this->actingAs($admin)->get('/painel')->assertInertia(fn (Assert $p) => $p->where('configuracaoEmFalta', ['NUIT']));

        // Quem não configura não vê o aviso
        $this->actingAs($this->utilizadorComPerfil('Comercial'))->get('/painel')->assertInertia(fn (Assert $p) => $p->where('configuracaoEmFalta', []));

        $this->actingAs($admin)->post('/administracao/configuracao/empresa', $this->dadosEmpresa());
        $this->get('/painel')->assertInertia(fn (Assert $p) => $p->where('configuracaoEmFalta', []));
    }
}
