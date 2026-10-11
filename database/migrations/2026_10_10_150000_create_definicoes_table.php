<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Configuração da empresa e dos documentos (chave → valor), ver App\Support\Definicoes. */
    public function up(): void
    {
        Schema::create('definicoes', function (Blueprint $table) {
            $table->string('chave', 100)->primary();
            $table->text('valor')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('definicoes');
    }
};
