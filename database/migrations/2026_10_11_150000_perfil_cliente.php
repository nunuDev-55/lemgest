<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;

/** Perfil Cliente (contas da loja): permissões próprias na guarda "cliente" */
return new class extends Migration
{
    public function up(): void
    {
        Permissoes::sincronizar();
    }

    public function down(): void
    {
        // As permissões ficam: apagá-las tiraria o acesso às contas de clientes
    }
};
