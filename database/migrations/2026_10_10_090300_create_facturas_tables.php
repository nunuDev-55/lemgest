<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facturas', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // FT2026/0001 — só existe depois de validada
            $table->string('tipo', 20)->default('normal');       // normal, credito
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->date('data_vencimento')->nullable();
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
            $table->string('ref_cliente', 100)->nullable(); // nº requisição / ordem de compra
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->string('estado', 20)->default('rascunho'); // rascunho, validada, paga, abandonada
            $table->string('motivo_abandono', 255)->nullable();
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('total_pago', 15, 2)->default(0);
            $table->timestamp('validada_em')->nullable();
            $table->foreignId('validada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['estado', 'data']);
        });

        Schema::create('factura_linhas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained('facturas')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->text('descricao');
            $table->decimal('quantidade', 12, 3)->default(1);
            $table->string('unidade', 10)->nullable();
            $table->decimal('preco_unitario', 15, 2)->default(0); // sem IVA
            $table->decimal('desconto', 5, 2)->default(0);        // percentagem
            $table->decimal('taxa_iva', 5, 2)->default(16);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedInteger('posicao')->default(0);
            $table->timestamps();
        });

        Schema::create('pagamentos', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->unique(); // PG2026/0001
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->string('metodo', 20);
            $table->string('numero_documento', 60)->nullable(); // nº do cheque, da transferência ou do M-Pesa
            $table->string('remetente', 120)->nullable();
            $table->text('comentario')->nullable();
            $table->decimal('valor', 15, 2);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Um pagamento pode liquidar várias facturas do mesmo cliente.
        Schema::create('factura_pagamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pagamento_id')->constrained('pagamentos')->cascadeOnDelete();
            $table->foreignId('factura_id')->constrained('facturas')->restrictOnDelete();
            $table->decimal('valor', 15, 2);
            $table->timestamps();
            $table->unique(['pagamento_id', 'factura_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factura_pagamento');
        Schema::dropIfExists('pagamentos');
        Schema::dropIfExists('factura_linhas');
        Schema::dropIfExists('facturas');
    }
};
