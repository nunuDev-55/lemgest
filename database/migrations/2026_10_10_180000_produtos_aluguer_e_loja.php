<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Etapa 2 do roadmap: produtos de aluguer.
 * Categorias, preço por dia, quantidade que a LemServ possui, opções da loja e fotos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 80)->unique();
            $table->string('descricao', 255)->nullable();
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });

        // Categorias iniciais (podem ser alteradas em Produtos → Categorias)
        $agora = now();
        DB::table('categorias')->insert(collect(['Lounge', 'Tendas', 'Mesas e cadeiras', 'Decoração', 'Serviços'])
            ->map(fn (string $nome, int $i) => ['nome' => $nome, 'ordem' => $i + 1, 'created_at' => $agora, 'updated_at' => $agora])
            ->all());

        Schema::table('produtos', function (Blueprint $table) {
            $table->foreignId('categoria_id')->nullable()->after('nome')->constrained('categorias')->nullOnDelete();
            $table->boolean('em_aluguer')->default(false)->after('em_compra');
            $table->decimal('preco_aluguer', 15, 2)->nullable()->after('em_aluguer'); // por dia, sem IVA
            $table->unsignedInteger('quantidade_total')->default(0)->after('preco_aluguer');
            $table->boolean('na_loja')->default(false)->after('quantidade_total');
            $table->boolean('loja_destaque')->default(false)->after('na_loja');
            $table->unsignedSmallInteger('loja_ordem')->default(0)->after('loja_destaque');
            $table->text('loja_descricao')->nullable()->after('loja_ordem');

            $table->index(['na_loja', 'loja_ordem']);
        });

        Schema::create('produto_fotos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            // Nome base dos ficheiros (um por tamanho: grande, media, mini), guardados fora da pasta pública
            $table->string('ficheiro', 120)->unique();
            $table->string('nome_original', 190)->nullable();
            $table->unsignedSmallInteger('largura');
            $table->unsignedSmallInteger('altura');
            $table->unsignedInteger('bytes');
            $table->boolean('principal')->default(false);
            $table->unsignedSmallInteger('posicao')->default(0);
            $table->foreignId('carregada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['produto_id', 'posicao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produto_fotos');
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropIndex(['na_loja', 'loja_ordem']);
            $table->dropConstrainedForeignId('categoria_id');
            $table->dropColumn(['em_aluguer', 'preco_aluguer', 'quantidade_total', 'na_loja', 'loja_destaque', 'loja_ordem', 'loja_descricao']);
        });
        Schema::dropIfExists('categorias');
    }
};
