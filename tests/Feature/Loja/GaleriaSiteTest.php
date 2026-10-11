<?php

namespace Tests\Feature\Loja;

use App\Models\FotoSite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Administração → Site e galeria: fotos de eventos que aparecem no site */
class GaleriaSiteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->admin = $this->administrador();
    }

    /** @return list<FotoSite> */
    private function carregar(int $n = 1): array
    {
        $fotos = array_map(fn ($i) => UploadedFile::fake()->image("evento-{$i}.jpg", 1200, 800), range(1, $n));
        $this->actingAs($this->admin, 'web')->post('/administracao/site/fotos', ['fotos' => $fotos])->assertSessionHasNoErrors();

        return FotoSite::query()->ordenadas()->get()->all();
    }

    public function test_carregar_guarda_tres_tamanhos_e_aparece_no_site(): void
    {
        [$foto] = $this->carregar();
        foreach (array_keys(FotoSite::TAMANHOS) as $t) {
            Storage::disk('local')->assertExists($foto->caminho($t));
        }
        $this->assertSame(['evento-1', 1200, 800, true], [$foto->legenda, $foto->largura, $foto->altura, $foto->visivel]);

        $this->actingAs($this->admin, 'web')->get('/administracao/site')->assertInertia(fn (Assert $p) => $p
            ->component('administracao/site/index')->has('fotos', 1));

        Auth::guard('web')->logout();
        $this->get('/')->assertInertia(fn (Assert $p) => $p->has('fotosSite', 1)->where('fotosSite.0.horizontal', true));
        $this->get("/catalogo/galeria/{$foto->id}/media")->assertOk()->assertHeader('Content-Type', 'image/webp');
    }

    public function test_legenda_capa_esconder_ordenar_e_apagar(): void
    {
        [$a, $b, $c, $d] = $this->carregar(4);

        $this->put("/administracao/site/fotos/{$a->id}", ['legenda' => 'Casamento no jardim'])->assertSessionHasNoErrors();
        $this->put("/administracao/site/fotos/{$a->id}", ['legenda' => ''])->assertSessionHasErrors('legenda');
        $this->assertSame('Casamento no jardim', $a->fresh()->legenda);

        // No máximo três na capa
        foreach ([$a, $b, $c] as $f) {
            $this->put("/administracao/site/fotos/{$f->id}", ['capa' => true])->assertSessionHasNoErrors();
        }
        $this->put("/administracao/site/fotos/{$d->id}", ['capa' => true])->assertSessionHasErrors('capa');

        // Esconder tira da capa e do site (a equipa continua a ver a foto; os visitantes não)
        $this->put("/administracao/site/fotos/{$c->id}", ['visivel' => false])->assertSessionHasNoErrors();
        $this->assertSame([false, false], [$c->fresh()->visivel, $c->fresh()->capa]);
        $this->get("/catalogo/galeria/{$c->id}/media")->assertOk();
        Auth::guard('web')->logout();
        $this->get("/catalogo/galeria/{$c->id}/media")->assertNotFound();
        $this->get('/')->assertInertia(fn (Assert $p) => $p->has('fotosSite', 3)->where('fotosSite.0.capa', true));

        // Ordenar e apagar (os ficheiros também saem)
        $this->actingAs($this->admin, 'web')->put("/administracao/site/fotos/{$b->id}/mover", ['direcao' => 'anterior']);
        $this->assertSame([$b->id, $a->id, $c->id, $d->id], FotoSite::query()->ordenadas()->pluck('id')->all());
        $this->delete("/administracao/site/fotos/{$d->id}")->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($d->caminho('media'));
        $this->assertDatabaseMissing('fotos_site', ['id' => $d->id]);
    }

    public function test_so_aceita_imagens_e_respeita_as_permissoes(): void
    {
        $this->actingAs($this->admin, 'web')->post('/administracao/site/fotos', ['fotos' => [UploadedFile::fake()->create('lista.pdf', 10, 'application/pdf')]])
            ->assertSessionHasErrors('fotos.0');

        $this->actingAs($this->utilizadorComPerfil('Gestor'), 'web')->get('/administracao/site')->assertOk();
        $comercial = $this->utilizadorComPerfil('Comercial');
        $this->actingAs($comercial, 'web')->get('/administracao/site')->assertForbidden();
        $this->post('/administracao/site/fotos', ['fotos' => [UploadedFile::fake()->image('x.jpg')]])->assertForbidden();
    }
}
