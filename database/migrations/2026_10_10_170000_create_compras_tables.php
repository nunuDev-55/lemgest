<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Compras a fornecedores (ver docs/analise-dolibarr/07-compras.md). */
    public function up(): void
    {
        $linhas = function (Blueprint $table) {
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->text('descricao');
            $table->decimal('quantidade', 12, 3)->default(1);
            $table->string('unidade', 10)->nullable();
            $table->decimal('preco_unitario', 15, 2)->default(0); // preço de compra sem IVA
            $table->decimal('desconto', 5, 2)->default(0);
            $table->decimal('taxa_iva', 5, 2)->default(16);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedInteger('posicao')->default(0);
            $table->timestamps();
        };

        Schema::create('encomendas_fornecedor', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // EF2026/0001
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->date('data_entrega')->nullable(); // entrega prevista pelo fornecedor
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
            $table->string('ref_fornecedor', 60)->nullable(); // nº da proposta / cotação do fornecedor
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->string('estado', 20)->default('rascunho'); // rascunho, validada, encomendada, recebida, anulada
            $table->boolean('facturada')->default(false);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamp('validada_em')->nullable();
            $table->foreignId('validada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->date('encomendada_em')->nullable();
            $table->string('meio_encomenda', 20)->nullable(); // email, telefone, whatsapp, presencial
            $table->timestamp('recebida_em')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['estado', 'data']);
        });

        Schema::create('encomenda_fornecedor_linhas', function (Blueprint $table) use ($linhas) {
            $table->id();
            $table->foreignId('encomenda_fornecedor_id')->constrained('encomendas_fornecedor')->cascadeOnDelete();
            $linhas($table);
        });

        Schema::create('facturas_fornecedor', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // FF2026/0001 — número interno, ao validar
            $table->string('ref_fornecedor', 60); // número da factura do fornecedor
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->foreignId('encomenda_fornecedor_id')->nullable()->constrained('encomendas_fornecedor')->nullOnDelete();
            $table->date('data');
            $table->date('data_vencimento')->nullable();
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
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

            // A mesma factura do mesmo fornecedor não pode ser lançada duas vezes
            $table->unique(['terceiro_id', 'ref_fornecedor']);
            $table->index(['estado', 'data_vencimento']);
        });

        Schema::create('factura_fornecedor_linhas', function (Blueprint $table) use ($linhas) {
            $table->id();
            $table->foreignId('factura_fornecedor_id')->constrained('facturas_fornecedor')->cascadeOnDelete();
            $linhas($table);
        });

        Schema::create('pagamentos_fornecedor', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->unique(); // PF2026/0001
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->string('metodo', 20);
            $table->string('numero_documento', 60)->nullable();
            $table->text('comentario')->nullable();
            $table->decimal('valor', 15, 2);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('factura_fornecedor_pagamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pagamento_fornecedor_id')->constrained('pagamentos_fornecedor')->cascadeOnDelete();
            $table->foreignId('factura_fornecedor_id')->constrained('facturas_fornecedor')->restrictOnDelete();
            $table->decimal('valor', 15, 2);
            $table->timestamps();
            $table->unique(['pagamento_fornecedor_id', 'factura_fornecedor_id'], 'ffp_pagamento_factura_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factura_fornecedor_pagamento');
        Schema::dropIfExists('pagamentos_fornecedor');
        Schema::dropIfExists('factura_fornecedor_linhas');
        Schema::dropIfExists('facturas_fornecedor');
        Schema::dropIfExists('encomenda_fornecedor_linhas');
        Schema::dropIfExists('encomendas_fornecedor');
    }
};
