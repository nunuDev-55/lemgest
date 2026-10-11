<?php

use App\Support\Permissoes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Etapa 6 do roadmap: contas de clientes (loja e área do cliente).
 *
 * São separadas dos utilizadores da equipa: outra tabela, outra sessão (guarda "cliente") e outra página de entrada.
 * O cliente regista-se, a LemServ aprova (D7) e só então a conta fica ligada a uma ficha de cliente (terceiro).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contas_cliente', function (Blueprint $table) {
            $table->id();
            // Ficha de cliente; preenchida quando a LemServ aprova a conta
            $table->foreignId('terceiro_id')->nullable()->constrained('terceiros')->nullOnDelete();
            $table->string('nome', 190);
            $table->string('email', 190)->unique();
            $table->string('telemovel', 30);
            $table->string('nuit', 9)->nullable();
            $table->string('provincia', 10)->nullable();
            $table->string('cidade', 100)->nullable();
            $table->string('bairro', 100)->nullable();
            $table->string('morada', 255)->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->string('estado', 12)->default('pendente'); // pendente, activa, recusada, suspensa
            $table->string('motivo', 255)->nullable(); // da recusa ou da suspensão
            $table->timestamp('aprovada_em')->nullable();
            $table->foreignId('aprovada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('ultimo_acesso_em')->nullable();
            $table->timestamps();

            $table->index('estado');
        });

        // Pedidos de nova senha dos clientes (separados dos da equipa)
        Schema::create('password_reset_tokens_clientes', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Permissoes::sincronizar();
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens_clientes');
        Schema::dropIfExists('contas_cliente');
    }
};
