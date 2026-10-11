<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Despesas do dia-a-dia que não vêm de facturas de fornecedores (combustível, salários, renda, energia...).
 * Com as compras de matéria-prima, dão os gastos que os Resultados comparam com os ganhos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('despesas', function (Blueprint $table) {
            $table->id();
            $table->date('data')->index();
            $table->string('categoria', 20)->index();
            $table->string('descricao', 190);
            $table->decimal('valor', 12, 2);
            $table->string('metodo', 20);
            $table->foreignId('terceiro_id')->nullable()->constrained('terceiros')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Permissoes::sincronizar();
    }

    public function down(): void
    {
        Schema::dropIfExists('despesas');
    }
};
