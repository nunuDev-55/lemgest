<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Etapa 3 do roadmap: stock.
 *
 * Cada mudança de quantidade é um movimento (entrada, saída para aluguer, devolução, abate, ajuste).
 * O produto guarda os totais actuais (quantidade_total e quantidade_fora) para as listas serem rápidas;
 * a soma dos movimentos dá sempre esses mesmos totais.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            // Peças que estão neste momento fora do armazém (alugadas e ainda não devolvidas)
            $table->unsignedInteger('quantidade_fora')->default(0)->after('quantidade_total');
        });

        Schema::create('inventarios', function (Blueprint $table) {
            $table->id();
            $table->date('data');
            $table->string('nota', 255)->nullable();
            $table->unsignedInteger('produtos_contados')->default(0);
            $table->unsignedInteger('diferencas')->default(0);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('inventario_linhas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            // Cópia da referência e do nome: o inventário continua legível mesmo que o produto mude
            $table->string('referencia', 50);
            $table->string('nome', 190);
            $table->unsignedInteger('esperado');
            $table->unsignedInteger('contado');
            $table->integer('diferenca');
        });

        Schema::create('movimentos_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->string('tipo', 12); // inicial, entrada, saida, devolucao, abate, ajuste, anulacao
            $table->unsignedInteger('quantidade'); // sempre positiva; o sentido está nos deltas
            $table->integer('delta_total');
            $table->integer('delta_fora');
            $table->unsignedInteger('total_depois');
            $table->unsignedInteger('fora_depois');
            $table->date('data');
            // Saídas: quando devem voltar e quantas peças ainda não voltaram
            $table->date('devolucao_prevista')->nullable();
            $table->unsignedInteger('pendente')->default(0);
            // Devoluções e abates de peças que estavam fora: a saída a que se referem
            $table->foreignId('saida_id')->nullable()->constrained('movimentos_stock')->nullOnDelete();
            $table->foreignId('terceiro_id')->nullable()->constrained('terceiros')->nullOnDelete();
            $table->string('motivo', 190)->nullable();
            // Documento que originou o movimento (encomenda a fornecedor, inventário e, na etapa 4, reserva)
            $table->nullableMorphs('origem');
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['produto_id', 'id']);
            $table->index(['tipo', 'pendente']);
            $table->index('data');
        });

        // Saldo inicial: a quantidade escrita à mão na etapa 2 passa a ser o primeiro movimento de cada produto
        $agora = now();
        foreach (DB::table('produtos')->where('tipo', 'produto')->where('quantidade_total', '>', 0)->get(['id', 'quantidade_total']) as $p) {
            DB::table('movimentos_stock')->insert([
                'produto_id' => $p->id,
                'tipo' => 'inicial',
                'quantidade' => $p->quantidade_total,
                'delta_total' => $p->quantidade_total,
                'delta_fora' => 0,
                'total_depois' => $p->quantidade_total,
                'fora_depois' => 0,
                'data' => $agora->toDateString(),
                'motivo' => 'Quantidade existente quando o stock começou a ser controlado',
                'created_at' => $agora,
                'updated_at' => $agora,
            ]);
        }

        // Permissões novas (stock.ver, stock.movimentar, stock.inventariar) e os perfis que as recebem
        Permissoes::sincronizar();
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos_stock');
        Schema::dropIfExists('inventario_linhas');
        Schema::dropIfExists('inventarios');
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn('quantidade_fora');
        });
    }
};
