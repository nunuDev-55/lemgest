<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Favoritos do catálogo: as peças que cada cliente guardou com o coração (♡), para ver depois em A minha conta → Favoritos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favoritos', function (Blueprint $table) {
            $table->foreignId('conta_cliente_id')->constrained('contas_cliente')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['conta_cliente_id', 'produto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favoritos');
    }
};
