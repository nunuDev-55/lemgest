<?php

namespace Tests\Feature\Comercial;

use App\Models\Categoria;
use App\Models\Factura;
use App\Models\Produto;
use App\Models\ProdutoFoto;
use App\Models\Terceiro;
use App\Services\FotosProduto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Etapa 2 do roadmap: produtos de aluguer, categorias, fotos e opções da loja */
class ProdutosAluguerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function dadosProduto(array $alterar = []): array
    {
        return [
            'referencia' => 'CAD-TIFF',
            'tipo' => 'produto',
            'nome' => 'Cadeira Tiffany branca',
            'categoria_id' => Categoria::where('nome', 'Mesas e cadeiras')->value('id'),
            'taxa_iva' => '16.00',
            'unidade' => 'un',
            'em_aluguer' => true,
            'preco_aluguer' => '120,00',
            'quantidade_total' => '250',
            'em_venda' => false,
            'em_compra' => false,
            'na_loja' => true,
            'loja_destaque' => true,
            'loja_ordem' => '2',
            'loja_descricao' => 'Cadeira em resina com almofada.',
            ...$alterar,
        ];
    }

    private function produtoComFotos(int $n = 1): Produto
    {
        $produto = Produto::factory()->create(['em_aluguer' => true, 'preco_aluguer' => '100.00']);
        $armazem = $this->utilizadorComPerfil('Armazém');
        $fotos = array_map(fn ($i) => UploadedFile::fake()->image("foto{$i}.jpg", 1200, 900), range(1, $n));
        $this->actingAs($armazem)->post("/produtos/{$produto->id}/fotos", ['fotos' => $fotos])->assertSessionHasNoErrors();

        return $produto;
    }

    public function test_categorias_iniciais_existem(): void
    {
        $this->assertSame(['Lounge', 'Tendas', 'Mesas e cadeiras', 'Decoração', 'Serviços'], Categoria::orderBy('ordem')->pluck('nome')->all());
    }

    public function test_criar_produto_de_aluguer_com_categoria_e_loja(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto())->assertSessionHasNoErrors();

        $p = Produto::where('referencia', 'CAD-TIFF')->firstOrFail();
        $this->assertTrue($p->em_aluguer);
        $this->assertSame('120.00', $p->preco_aluguer);
        $this->assertSame('139.20', $p->precoAluguerComIva());
        $this->assertSame(250, $p->quantidade_total);
        $this->assertSame('0.00', $p->preco); // não se vende: o preço de venda fica a zero
        $this->assertSame('Mesas e cadeiras', $p->categoria->nome);
        $this->assertTrue($p->na_loja);
        $this->assertTrue($p->loja_destaque);
        $this->assertSame(2, $p->loja_ordem);

        $this->actingAs($armazem)->get('/produtos?estado=aluguer')->assertInertia(fn (Assert $pg) => $pg
            ->component('produtos/index')
            ->has('produtos.data', 1)
            ->where('produtos.data.0.categoria', 'Mesas e cadeiras')
            ->where('produtos.data.0.total', 250)
            ->where('produtos.data.0.foto', null));
        $this->actingAs($armazem)->get('/produtos?estado=venda')->assertInertia(fn (Assert $pg) => $pg->has('produtos.data', 0));
        $this->actingAs($armazem)->get('/produtos?categoria='.Categoria::where('nome', 'Tendas')->value('id'))->assertInertia(fn (Assert $pg) => $pg->has('produtos.data', 0));
        $this->actingAs($armazem)->get('/produtos?categoria=sem')->assertInertia(fn (Assert $pg) => $pg->has('produtos.data', 0));

        $this->actingAs($armazem)->get("/produtos/{$p->id}")->assertInertia(fn (Assert $pg) => $pg
            ->component('produtos/mostrar')
            ->where('produto.preco_aluguer_com_iva', '139.20')
            ->where('produto.categoria', 'Mesas e cadeiras')
            ->has('produto.fotos', 0));
        $this->actingAs($armazem)->get("/produtos/{$p->id}/editar")->assertInertia(fn (Assert $pg) => $pg->component('produtos/formulario')->has('categorias', 5));
    }

    public function test_precos_obrigatorios_conforme_o_que_se_faz_com_o_produto(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto(['preco_aluguer' => '']))->assertSessionHasErrors('preco_aluguer');
        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto(['em_venda' => true, 'preco' => '']))->assertSessionHasErrors('preco');
        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto(['quantidade_total' => '2,5']))->assertSessionHasErrors('quantidade_total');
        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto(['categoria_id' => 9999]))->assertSessionHasErrors('categoria_id');

        // Sem aluguer, o preço por dia pode ficar vazio
        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto(['em_aluguer' => false, 'preco_aluguer' => '', 'em_venda' => true, 'preco' => '900']))
            ->assertSessionHasNoErrors();
        $this->assertNull(Produto::where('referencia', 'CAD-TIFF')->value('preco_aluguer'));
    }

    public function test_servico_nao_tem_quantidade(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)->post('/produtos', $this->dadosProduto([
            'referencia' => 'MONT', 'tipo' => 'servico', 'nome' => 'Montagem', 'em_aluguer' => false, 'em_venda' => true, 'preco' => '2000', 'quantidade_total' => '7',
        ]))->assertSessionHasNoErrors();

        $this->assertSame(0, Produto::where('referencia', 'MONT')->value('quantidade_total'));
    }

    public function test_carregar_fotos_reduz_em_tres_tamanhos_e_a_primeira_fica_principal(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');
        $produto = Produto::factory()->create();

        $this->actingAs($armazem)->post("/produtos/{$produto->id}/fotos", [
            'fotos' => [UploadedFile::fake()->image('sofa.jpg', 3000, 2000), UploadedFile::fake()->image('sofa-lado.png', 500, 400)],
        ])->assertSessionHasNoErrors()->assertSessionHas('sucesso', '2 fotos adicionadas.');

        $fotos = $produto->fotos()->get();
        $this->assertCount(2, $fotos);
        [$primeira, $segunda] = [$fotos[0], $fotos[1]];

        $this->assertTrue($primeira->principal);
        $this->assertFalse($segunda->principal);
        $this->assertSame([1600, 1067], [$primeira->largura, $primeira->altura]); // reduzida
        $this->assertSame([500, 400], [$segunda->largura, $segunda->altura]); // pequena: fica como está
        $this->assertSame('sofa.jpg', $primeira->nome_original);

        foreach (array_keys(ProdutoFoto::TAMANHOS) as $tamanho) {
            Storage::disk('local')->assertExists($primeira->caminho($tamanho));
        }
        $mini = getimagesizefromstring(Storage::disk('local')->get($primeira->caminho('mini')));
        $this->assertSame([320, 213, 'image/webp'], [$mini[0], $mini[1], $mini['mime']]);

        $this->actingAs($armazem)->get($primeira->url('mini'))->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->actingAs($armazem)->get("/produtos/fotos/{$primeira->id}/enorme")->assertNotFound();

        $this->actingAs($armazem)->get('/produtos')->assertInertia(fn (Assert $pg) => $pg->where('produtos.data.0.foto', $primeira->url('mini')));
        $this->assertDatabaseHas('activity_log', ['subject_id' => $produto->id, 'description' => '2 fotos adicionadas']);
    }

    public function test_tornar_principal_mover_e_apagar(): void
    {
        $produto = $this->produtoComFotos(3);
        $armazem = $this->utilizadorComPerfil('Armazém');
        [$a, $b, $c] = $produto->fotos()->get()->all();

        $this->actingAs($armazem)->put("/produtos/{$produto->id}/fotos/{$c->id}/principal")->assertSessionHasNoErrors();
        $this->assertSame([$c->id], $produto->fotos()->where('principal', true)->pluck('id')->all());

        $this->actingAs($armazem)->put("/produtos/{$produto->id}/fotos/{$c->id}/mover", ['direcao' => 'anterior']);
        $this->assertSame([$a->id, $c->id, $b->id], $produto->fotos()->pluck('id')->all());
        $this->actingAs($armazem)->put("/produtos/{$produto->id}/fotos/{$a->id}/mover", ['direcao' => 'anterior']); // já é a primeira
        $this->assertSame([$a->id, $c->id, $b->id], $produto->fotos()->pluck('id')->all());

        // Apagar a principal: a primeira das restantes passa a principal e os ficheiros desaparecem
        $this->actingAs($armazem)->delete("/produtos/{$produto->id}/fotos/{$c->id}")->assertSessionHasNoErrors();
        $this->assertSame([$a->id], $produto->fotos()->where('principal', true)->pluck('id')->all());
        Storage::disk('local')->assertMissing($c->caminho('grande'));
        Storage::disk('local')->assertExists($a->caminho('grande'));

        // Uma foto de outro produto não se mexe por este endereço
        $outro = $this->produtoComFotos();
        $alheia = $outro->fotos()->first();
        $this->actingAs($armazem)->delete("/produtos/{$produto->id}/fotos/{$alheia->id}")->assertNotFound();
    }

    public function test_so_aceita_imagens_e_respeita_o_maximo(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');
        $produto = Produto::factory()->create();

        $this->actingAs($armazem)->post("/produtos/{$produto->id}/fotos", ['fotos' => [UploadedFile::fake()->create('lista.pdf', 100, 'application/pdf')]])
            ->assertSessionHasErrors('fotos.0');
        $this->actingAs($armazem)->post("/produtos/{$produto->id}/fotos", ['fotos' => [UploadedFile::fake()->createWithContent('falsa.jpg', 'isto não é uma foto')]])
            ->assertSessionHasErrors();
        $this->assertSame(0, $produto->fotos()->count());

        for ($i = 0; $i < FotosProduto::MAXIMO_POR_PRODUTO; $i++) {
            $produto->fotos()->create(['ficheiro' => "teste{$i}", 'largura' => 10, 'altura' => 10, 'bytes' => 10, 'posicao' => $i]);
        }
        $this->actingAs($armazem)->post("/produtos/{$produto->id}/fotos", ['fotos' => [UploadedFile::fake()->image('mais.jpg')]])
            ->assertSessionHasErrors('fotos');
    }

    public function test_apagar_produto_apaga_os_ficheiros_das_fotos(): void
    {
        $produto = $this->produtoComFotos(2);
        $fotos = $produto->fotos()->get();

        $this->actingAs($this->utilizadorComPerfil('Armazém'))->delete("/produtos/{$produto->id}")->assertRedirect('/produtos');

        $this->assertSame(0, ProdutoFoto::count());
        foreach ($fotos as $f) {
            Storage::disk('local')->assertMissing($f->caminho('media'));
        }
    }

    public function test_quem_so_ve_produtos_ve_as_fotos_mas_nao_as_muda(): void
    {
        $produto = $this->produtoComFotos();
        $foto = $produto->fotos()->first();
        $comercial = $this->utilizadorComPerfil('Comercial');

        $this->actingAs($comercial)->get($foto->url('media'))->assertOk();
        $this->actingAs($comercial)->post("/produtos/{$produto->id}/fotos", ['fotos' => [UploadedFile::fake()->image('x.jpg')]])->assertForbidden();
        $this->actingAs($comercial)->delete("/produtos/{$produto->id}/fotos/{$foto->id}")->assertForbidden();
        $this->actingAs($comercial)->post('/produtos/categorias', ['nome' => 'Iluminação'])->assertForbidden();
        $this->actingAs($comercial)->get('/produtos/categorias')->assertOk();

        // Sem sessão, nada
        auth()->logout();
        $this->get($foto->url('media'))->assertRedirect('/login');
    }

    public function test_categorias_criar_alterar_ordenar_e_apagar(): void
    {
        $armazem = $this->utilizadorComPerfil('Armazém');

        $this->actingAs($armazem)->post('/produtos/categorias', ['nome' => 'Iluminação', 'descricao' => 'Luzes e candeeiros'])->assertSessionHasNoErrors();
        $this->actingAs($armazem)->post('/produtos/categorias', ['nome' => 'Lounge'])->assertSessionHasErrors('nome');
        $ilum = Categoria::where('nome', 'Iluminação')->firstOrFail();
        $this->assertSame(6, $ilum->ordem);

        $this->actingAs($armazem)->put("/produtos/categorias/{$ilum->id}", ['nome' => 'Iluminação e som'])->assertSessionHasNoErrors();
        $this->assertSame('Iluminação e som', $ilum->fresh()->nome);

        $this->actingAs($armazem)->put("/produtos/categorias/{$ilum->id}/mover", ['direcao' => 'anterior']);
        $this->assertSame(['Lounge', 'Tendas', 'Mesas e cadeiras', 'Decoração', 'Iluminação e som', 'Serviços'], Categoria::orderBy('ordem')->pluck('nome')->all());

        // Com produtos não se apaga; vazia, sim
        $lounge = Categoria::where('nome', 'Lounge')->firstOrFail();
        Produto::factory()->create(['categoria_id' => $lounge->id]);
        $this->actingAs($armazem)->delete("/produtos/categorias/{$lounge->id}")->assertSessionHas('erro');
        $this->assertDatabaseHas('categorias', ['id' => $lounge->id]);
        $this->actingAs($armazem)->delete("/produtos/categorias/{$ilum->id}")->assertSessionHas('sucesso');
        $this->assertDatabaseMissing('categorias', ['id' => $ilum->id]);

        $this->actingAs($armazem)->get('/produtos/categorias')->assertInertia(fn (Assert $pg) => $pg
            ->component('produtos/categorias')
            ->has('categorias', 5)
            ->where('categorias.0.produtos', 1)
            ->where('semCategoria', 0));
    }

    public function test_factura_propoe_o_preco_por_dia_dos_produtos_de_aluguer(): void
    {
        $financeiro = $this->utilizadorComPerfil('Financeiro');
        $cliente = Terceiro::factory()->create();
        $sofa = Produto::factory()->create(['em_venda' => false, 'preco' => '0', 'em_aluguer' => true, 'preco_aluguer' => '1500.00']);
        $transporte = Produto::factory()->create(['tipo' => 'servico', 'em_venda' => true, 'preco' => '500.00']);

        $this->actingAs($financeiro)->post('/facturas', ['terceiro_id' => $cliente->id, 'data' => '2026-10-10', 'termos_pagamento' => 'pronto'])->assertSessionHasNoErrors();
        $f = Factura::latest('id')->firstOrFail();

        // O produto só de aluguer aparece na lista de produtos da factura, com o preço por dia
        $this->actingAs($financeiro)->get("/facturas/{$f->id}")->assertInertia(fn (Assert $pg) => $pg
            ->where('produtos', fn ($lista) => collect($lista)->firstWhere('id', $sofa->id)['preco'] === '1500.00'));

        $this->actingAs($financeiro)->post("/facturas/{$f->id}/linhas", ['produto_id' => $sofa->id, 'quantidade' => '2'])->assertSessionHasNoErrors();
        $this->actingAs($financeiro)->post("/facturas/{$f->id}/linhas", ['produto_id' => $transporte->id, 'quantidade' => '1'])->assertSessionHasNoErrors();

        $this->assertSame(['1500.00', '500.00'], $f->linhas()->orderBy('posicao')->pluck('preco_unitario')->all());
        $this->assertSame('3500.00', $f->fresh()->total_sem_iva);
    }
}
