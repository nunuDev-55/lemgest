<?php

use App\Services\FotosSite;
use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fotos do site (galeria de eventos e capa), geridas em Administração → Site e galeria.
 * Começa com as fotos de eventos da LemServ que estão em database/fotos-site.
 */
return new class extends Migration
{
    /** Fotos iniciais: ficheiro => [legenda, na capa] */
    private const INICIAIS = [
        '01-casamento-jardim' => ['Casamento no jardim, com arco de flores e sofás curvos brancos', true],
        '02-tenda-branca' => ['Tenda branca com cortinas e lounge em bouclé no jardim', false],
        '03-tenda-noite' => ['Lounge à noite debaixo de uma tenda com lustres', false],
        '04-vista-mar' => ['Lounge com vista para o mar, poltronas brancas e puffs vermelhos', true],
        '05-mesas-altas-mar' => ['Mesas altas brancas e bancos num terraço junto ao mar', false],
        '06-tenda-vidro' => ['Sofás curvos creme numa tenda de vidro', true],
        '07-sofa-curvo-creme' => ['Sofá curvo, puffs e mesas espelhadas em tons creme', false],
        '08-varanda-boucle' => ['Lounge em bouclé branco numa varanda com plantas', false],
        '09-esplanada-vermelho' => ['Esplanada com sofás bouclé e almofadas vermelhas', false],
        '10-veludo-azul-verde' => ['Sofás brancos com mesas de veludo azul e verde', false],
        '11-jardim-amarelo-azul' => ['Sofá branco com almofadas amarelas e azuis no jardim', false],
        '12-evento-empresa' => ['Evento de empresa com sofás brancos e mesa vermelha', false],
        '13-conjunto-branco' => ['Conjunto branco com mesa de centro verde-oliva', false],
        '14-rosa-veludo' => ['Sofá branco com almofadas e mesas de veludo rosa', false],
        '15-aniversario-rosa' => ['Aniversário em rosa e amarelo no jardim', false],
        '16-piscina-preto' => ['Sofá preto curvo junto à piscina, com almofadas douradas', false],
        '17-sala-preto-branco' => ['Sala com sofás brancos, almofadas pretas e mesas lacadas', false],
        '18-tenda-lilas' => ['Tenda branca com almofadas lilás e rosa', false],
        '19-lounge-rosa-amarelo' => ['Lounge colorido com puffs rosa e amarelos', false],
        '20-terraco-relva' => ['Puffs e sofás brancos num terraço relvado', false],
    ];

    public function up(): void
    {
        Schema::create('fotos_site', function (Blueprint $table) {
            $table->id();
            $table->string('ficheiro', 40)->unique();
            $table->string('legenda', 190);
            $table->unsignedInteger('largura');
            $table->unsignedInteger('altura');
            $table->unsignedInteger('bytes');
            $table->boolean('capa')->default(false);
            $table->boolean('visivel')->default(true);
            $table->unsignedInteger('posicao')->default(0);
            $table->foreignId('carregada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Permissoes::sincronizar();

        // Nos testes não se gravam ficheiros: cada teste cria as suas fotos
        if (app()->runningUnitTests()) {
            return;
        }
        $servico = app(FotosSite::class);
        foreach (self::INICIAIS as $nome => [$legenda, $capa]) {
            $caminho = database_path("fotos-site/{$nome}.webp");
            if (is_file($caminho)) {
                $servico->adicionar($caminho, "{$nome}.webp", $legenda, null, $capa);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('fotos_site');
    }
};
