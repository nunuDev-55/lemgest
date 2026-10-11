<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Etapa 4 do roadmap: reservas de aluguer (AL2026/0001).
 * pedido → confirmada (prende o material) → entregue (o stock sai) → devolvida (o stock volta); pedido/confirmada → cancelada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 20)->unique();
            $table->foreignId('terceiro_id')->constrained('terceiros');
            $table->string('origem', 10)->default('balcao'); // balcao, loja (etapa 8)
            $table->string('estado', 12)->default('pedido');

            // Datas: o evento (um ou vários dias) e quando o material sai e volta
            $table->date('data_evento');
            $table->date('data_fim_evento');
            $table->date('data_entrega');
            $table->date('data_recolha');
            $table->unsignedSmallInteger('dias')->default(1); // dias a cobrar, propostos às linhas

            $table->string('local', 255)->nullable();
            $table->string('contacto_local', 120)->nullable();
            $table->boolean('transporte')->default(false);
            $table->string('tema', 120)->nullable();
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();

            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->timestamp('confirmada_em')->nullable();
            $table->foreignId('confirmada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('entregue_em')->nullable();
            $table->timestamp('devolvida_em')->nullable();
            $table->timestamp('cancelada_em')->nullable();
            $table->string('motivo_cancelamento', 190)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['estado', 'data_entrega']);
            $table->index(['estado', 'data_recolha']);
            $table->index('data_evento');
        });

        Schema::create('reserva_linhas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reserva_id')->constrained('reservas')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->text('descricao');
            $table->decimal('quantidade', 12, 3)->default(1);
            $table->string('unidade', 10)->nullable();
            $table->unsignedSmallInteger('dias')->default(1);
            $table->decimal('preco_unitario', 15, 2)->default(0); // por dia, nos produtos de aluguer
            $table->decimal('desconto', 5, 2)->default(0);
            $table->decimal('taxa_iva', 5, 2)->default(16);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedInteger('posicao')->default(0);
            // A saída de stock desta linha (quando o material foi entregue)
            $table->foreignId('movimento_saida_id')->nullable()->constrained('movimentos_stock')->nullOnDelete();
            $table->timestamps();
        });

        Permissoes::sincronizar();
    }

    public function down(): void
    {
        Schema::dropIfExists('reserva_linhas');
        Schema::dropIfExists('reservas');
    }
};
