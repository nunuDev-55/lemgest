<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contactos dos terceiros e documentos do módulo Comércio (orçamentos e encomendas),
 * seguindo a análise em docs/analise-dolibarr/03-terceiros.md e 04-comercio.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contactos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('terceiro_id')->constrained('terceiros')->cascadeOnDelete();
            $table->string('nome', 190);
            $table->string('cargo', 120)->nullable();
            $table->string('telefone', 30)->nullable();
            $table->string('telemovel', 30)->nullable();
            $table->string('email', 190)->nullable();
            $table->text('nota')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->index('nome');
        });

        Schema::create('orcamentos', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // OR2026/0001 — atribuído ao validar
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->date('data');
            $table->unsignedSmallInteger('validade_dias')->default(30);
            $table->date('data_fim_validade')->nullable();
            $table->date('data_entrega')->nullable();
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
            $table->string('ref_cliente', 100)->nullable();
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->string('estado', 20)->default('rascunho'); // rascunho, aberto, assinado, recusado, facturado
            $table->string('nota_fecho', 255)->nullable();
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamp('validado_em')->nullable();
            $table->foreignId('validado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fechado_em')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['estado', 'data']);
        });

        Schema::create('encomendas', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->nullable()->unique(); // EN2026/0001
            $table->foreignId('terceiro_id')->constrained('terceiros')->restrictOnDelete();
            $table->foreignId('orcamento_id')->nullable()->constrained('orcamentos')->nullOnDelete();
            $table->date('data');
            $table->date('data_entrega')->nullable();
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
            $table->string('ref_cliente', 100)->nullable();
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->string('estado', 20)->default('rascunho'); // rascunho, validada, entregue, anulada
            $table->boolean('facturada')->default(false);
            $table->decimal('total_sem_iva', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamp('validada_em')->nullable();
            $table->foreignId('validada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('entregue_em')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['estado', 'data']);
        });

        foreach (['orcamento' => 'orcamentos', 'encomenda' => 'encomendas'] as $singular => $tabela) {
            Schema::create("{$singular}_linhas", function (Blueprint $table) use ($singular, $tabela) {
                $table->id();
                $table->foreignId("{$singular}_id")->constrained($tabela)->cascadeOnDelete();
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
        }

        // Origem da factura (objectos relacionados)
        Schema::table('facturas', function (Blueprint $table) {
            $table->foreignId('orcamento_id')->nullable()->after('terceiro_id')->constrained('orcamentos')->nullOnDelete();
            $table->foreignId('encomenda_id')->nullable()->after('orcamento_id')->constrained('encomendas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('encomenda_id');
            $table->dropConstrainedForeignId('orcamento_id');
        });
        Schema::dropIfExists('encomenda_linhas');
        Schema::dropIfExists('orcamento_linhas');
        Schema::dropIfExists('encomendas');
        Schema::dropIfExists('orcamentos');
        Schema::dropIfExists('contactos');
    }
};
