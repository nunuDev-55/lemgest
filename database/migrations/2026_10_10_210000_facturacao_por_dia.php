<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Etapa 5 do roadmap: facturação por dia.
 *
 * As linhas dos documentos de venda passam a ter dias (total = quantidade × dias × preço por dia).
 * As linhas que já existem ficam com 1 dia, por isso nenhum documento muda de valor.
 * Facturas e reservas ficam ligadas: factura criada a partir de uma reserva, reserva criada a partir de um orçamento.
 */
return new class extends Migration
{
    private const TABELAS = ['orcamento_linhas', 'encomenda_linhas', 'factura_linhas', 'nota_credito_linhas'];

    public function up(): void
    {
        foreach (self::TABELAS as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->unsignedSmallInteger('dias')->default(1)->after('unidade');
            });
        }

        Schema::table('facturas', function (Blueprint $table) {
            $table->foreignId('reserva_id')->nullable()->after('encomenda_id')->constrained('reservas')->nullOnDelete();
        });

        Schema::table('reservas', function (Blueprint $table) {
            $table->foreignId('orcamento_id')->nullable()->after('terceiro_id')->constrained('orcamentos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reservas', fn (Blueprint $table) => $table->dropConstrainedForeignId('orcamento_id'));
        Schema::table('facturas', fn (Blueprint $table) => $table->dropConstrainedForeignId('reserva_id'));
        foreach (self::TABELAS as $tabela) {
            Schema::table($tabela, fn (Blueprint $table) => $table->dropColumn('dias'));
        }
    }
};
