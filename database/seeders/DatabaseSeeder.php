<?php

namespace Database\Seeders;

use App\Support\Permissoes;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Prepara a base de dados: permissões e perfis iniciais.
     * Não cria utilizadores — a conta do administrador é criada no primeiro acesso.
     */
    public function run(): void
    {
        Permissoes::sincronizar();
    }
}
