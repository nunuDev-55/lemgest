<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Terceiros: clientes, potenciais clientes e fornecedores na mesma tabela
 * (uma empresa pode ser cliente e fornecedor ao mesmo tempo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terceiros', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 190);
            $table->string('nome_alternativo', 190)->nullable();
            $table->boolean('e_cliente')->default(false);
            $table->boolean('e_potencial')->default(false);
            $table->boolean('e_fornecedor')->default(false);
            $table->string('codigo_cliente', 20)->nullable()->unique();
            $table->string('codigo_fornecedor', 20)->nullable()->unique();
            $table->string('tipo_entidade', 20)->nullable(); // particular, empresa, estado, ong
            $table->string('nuit', 9)->nullable()->index();
            $table->boolean('sujeito_iva')->default(true);
            $table->string('morada', 255)->nullable();
            $table->string('codigo_postal', 20)->nullable();
            $table->string('cidade', 100)->nullable();
            $table->string('provincia', 10)->nullable();
            $table->string('pais', 2)->default('MZ');
            $table->string('telefone', 30)->nullable();
            $table->string('telemovel', 30)->nullable();
            $table->string('email', 190)->nullable();
            $table->string('website', 190)->nullable();
            $table->string('termos_pagamento', 20)->default('pronto');
            $table->string('metodo_pagamento', 20)->nullable();
            $table->text('nota_publica')->nullable();
            $table->text('nota_privada')->nullable();
            $table->boolean('activo')->default(true);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terceiros');
    }
};
