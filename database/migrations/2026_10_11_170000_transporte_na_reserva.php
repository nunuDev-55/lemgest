<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O transporte é um requisito da reserva (sim ou não), não um serviço escolhido à mão.
 * Com transporte, a reserva leva uma taxa (por omissão de 3 000 a 5 000 MT, conforme o local),
 * que o sistema põe numa linha própria para entrar nos totais e na factura.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->decimal('taxa_transporte', 12, 2)->nullable()->after('transporte');
        });
        Schema::table('reserva_linhas', function (Blueprint $table) {
            $table->boolean('e_transporte')->default(false)->after('produto_id');
        });
    }

    public function down(): void
    {
        Schema::table('reserva_linhas', function (Blueprint $table) {
            $table->dropColumn('e_transporte');
        });
        Schema::table('reservas', function (Blueprint $table) {
            $table->dropColumn('taxa_transporte');
        });
    }
};
