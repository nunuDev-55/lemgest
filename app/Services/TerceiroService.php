<?php

namespace App\Services;

use App\Models\Terceiro;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Terceiros (clientes, potenciais e fornecedores).
 * Os códigos CL2026-0001 / FO2026-0001 são atribuídos automaticamente, como no Dolibarr.
 */
class TerceiroService
{
    public function __construct(private readonly Numeracao $numeracao) {}

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor): Terceiro
    {
        return DB::transaction(function () use ($dados, $autor) {
            $terceiro = new Terceiro($dados);
            $terceiro->criado_por = $autor->id;
            $this->atribuirCodigos($terceiro);
            $terceiro->save();

            return $terceiro;
        });
    }

    /** @param array<string, mixed> $dados */
    public function actualizar(Terceiro $terceiro, array $dados): Terceiro
    {
        return DB::transaction(function () use ($terceiro, $dados) {
            $terceiro->fill($dados);

            if (! $terceiro->e_cliente && $terceiro->getOriginal('e_cliente') && $terceiro->facturas()->exists()) {
                throw ValidationException::withMessages(['e_cliente' => 'Este terceiro já tem facturas e tem de continuar marcado como cliente.']);
            }

            $this->atribuirCodigos($terceiro);
            $terceiro->save();

            return $terceiro;
        });
    }

    public function alternarEstado(Terceiro $terceiro): Terceiro
    {
        $terceiro->activo = ! $terceiro->activo;
        $terceiro->save();

        return $terceiro;
    }

    public function apagar(Terceiro $terceiro): void
    {
        if ($terceiro->facturas()->exists() || DB::table('pagamentos')->where('terceiro_id', $terceiro->id)->exists()) {
            throw ValidationException::withMessages(['terceiro' => "{$terceiro->nome} tem documentos associados e não pode ser apagado. Pode encerrá-lo em vez disso."]);
        }

        $terceiro->delete();
    }

    /** Dá código de cliente/fornecedor a quem passa a sê-lo (os códigos nunca se reutilizam). */
    private function atribuirCodigos(Terceiro $terceiro): void
    {
        if (($terceiro->e_cliente || $terceiro->e_potencial) && $terceiro->codigo_cliente === null) {
            $terceiro->codigo_cliente = $this->numeracao->proximo('cliente');
        }
        if ($terceiro->e_fornecedor && $terceiro->codigo_fornecedor === null) {
            $terceiro->codigo_fornecedor = $this->numeracao->proximo('fornecedor');
        }
    }
}
