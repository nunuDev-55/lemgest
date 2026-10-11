<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Cada categoria tem um código (SOF, PUF...) que dá o código automático dos produtos (SOF-001, SOF-002...).
 * Material do produto (Napa, Tecido, Lã...): lista própria, editável ao lado das categorias.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->string('codigo', 10)->nullable()->unique()->after('nome');
        });

        // Códigos para as categorias que já existem: as três primeiras letras do nome (LOU, TEN, MES...)
        $usados = [];
        foreach (DB::table('categorias')->orderBy('ordem')->orderBy('id')->get(['id', 'nome']) as $c) {
            $base = substr(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', Str::ascii($c->nome))), 0, 3) ?: 'CAT';
            $codigo = $base;
            for ($n = 2; in_array($codigo, $usados, true); $n++) {
                $codigo = $base.$n;
            }
            $usados[] = $codigo;
            DB::table('categorias')->where('id', $c->id)->update(['codigo' => $codigo]);
        }

        Schema::create('materiais', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 60)->unique();
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });
        $agora = now();
        DB::table('materiais')->insert(collect(['Napa', 'Tecido', 'Lã'])
            ->map(fn (string $nome, int $i) => ['nome' => $nome, 'ordem' => $i + 1, 'created_at' => $agora, 'updated_at' => $agora])
            ->all());

        Schema::table('produtos', function (Blueprint $table) {
            $table->foreignId('material_id')->nullable()->after('categoria_id')->constrained('materiais')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_id');
        });
        Schema::dropIfExists('materiais');
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique(['codigo']);
            $table->dropColumn('codigo');
        });
    }
};
