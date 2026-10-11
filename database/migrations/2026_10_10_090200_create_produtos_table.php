<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            $table->string('referencia', 50)->unique();
            $table->string('tipo', 10)->default('produto'); // produto, servico
            $table->string('nome', 190);
            $table->text('descricao')->nullable();
            $table->decimal('preco', 15, 2)->default(0);        // preço de venda sem IVA
            $table->decimal('taxa_iva', 5, 2)->default(16);
            $table->string('unidade', 10)->default('un');
            $table->decimal('preco_compra', 15, 2)->nullable();
            $table->boolean('em_venda')->default(true);
            $table->boolean('em_compra')->default(true);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
