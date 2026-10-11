<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;

/** "Ver a loja" (loja.ver): a equipa abre a loja a partir do LemGest com preços e disponibilidade */
return new class extends Migration
{
    public function up(): void
    {
        Permissoes::sincronizar();
    }

    public function down(): void
    {
        //
    }
};
