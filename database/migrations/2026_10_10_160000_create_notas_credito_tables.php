<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Notas de crédito a clientes (ver docs/analise-dolibarr/06-notas-credito.md). */
    public function up(): void
    {
        Schema::create('notas_credito', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // NC2026/0001 — só existe depois de validada
            $table->foreignId('factura_id')->constrained('facturas')->restrictOnDelete(); // factura que corrige
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->string('motivo', 255);
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->string('estado', 20)->default('rascunho'); // rascunho, validada (por reembolsar), fechada
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('valor_abatido', 15, 2)->default(0);   // parte abatida no que faltava pagar da factura
            $table->decimal('valor_reembolso', 15, 2)->default(0); // parte a devolver ao cliente
            $table->date('reembolsado_em')->nullable();
            $table->string('reembolso_metodo', 20)->nullable();
            $table->string('reembolso_referencia', 60)->nullable();
            $table->timestamp('validada_em')->nullable();
            $table->foreignId('validada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['estado', 'data']);
        });

        Schema::create('nota_credito_linhas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nota_credito_id')->constrained('notas_credito')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->text('descricao');
            $table->decimal('quantidade', 12, 3)->default(1);
            $table->string('unidade', 10)->nullable();
            $table->decimal('preco_unitario', 15, 2)->default(0);
            $table->decimal('desconto', 5, 2)->default(0);
            $table->decimal('taxa_iva', 5, 2)->default(16);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedInteger('posicao')->default(0);
            $table->timestamps();
        });

        // O que falta pagar de uma factura passa a ser: total − pago − creditado
        Schema::table('facturas', function (Blueprint $table) {
            $table->decimal('total_creditado', 15, 2)->default(0)->after('total_pago');
        });
    }

    public function down(): void
    {
        Schema::table('facturas', fn (Blueprint $table) => $table->dropColumn('total_creditado'));
        Schema::dropIfExists('nota_credito_linhas');
        Schema::dropIfExists('notas_credito');
    }
};
