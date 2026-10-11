<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contadores das numerações (facturas, pagamentos, códigos de cliente...).
 * Uma linha por série e por ano; o número é reservado dentro de uma transacção.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('numeracoes', function (Blueprint $table) {
            $table->id();
            $table->string('serie', 30);
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('ultimo')->default(0);
            $table->timestamps();
            $table->unique(['serie', 'ano']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('numeracoes');
    }
};
