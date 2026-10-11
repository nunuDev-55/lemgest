<?php

namespace App\Services;

use App\Models\ContaCliente;
use App\Models\Terceiro;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Contas de clientes da loja (etapa 6 do roadmap).
 *
 * O cliente regista-se e a conta fica "por aprovar" (D7). Ao aprovar, a LemServ cria a ficha de cliente
 * ou liga a conta a uma ficha que já existe (o sistema sugere as que têm o mesmo NUIT, e-mail ou telemóvel),
 * para não haver clientes repetidos. Só uma conta activa e ligada a uma ficha entra na área do cliente.
 */
class ContasCliente
{
    public function __construct(private readonly TerceiroService $terceiros) {}

    /** @param array<string, mixed> $dados */
    public function registar(array $dados): ContaCliente
    {
        // A equipa usa o sistema interno; não entra na loja como cliente
        if (User::where('email', $dados['email'])->exists()) {
            throw ValidationException::withMessages(['email' => 'Este e-mail pertence a um utilizador da equipa LemServ. Use outro e-mail para a conta de cliente.']);
        }

        $conta = new ContaCliente($dados);
        $conta->estado = ContaCliente::PENDENTE;
        $conta->save();
        activity('contas')->performedOn($conta)->event('created')->log("Pedido de conta de cliente: {$conta->nome}");

        return $conta;
    }

    /**
     * Fichas de cliente que podem ser desta pessoa (mesmo NUIT, e-mail ou telemóvel).
     *
     * @return Collection<int, Terceiro>
     */
    public function sugestoes(ContaCliente $conta): Collection
    {
        $digitos = substr(preg_replace('/\D/', '', $conta->telemovel), -9);

        return Terceiro::query()
            ->where(fn ($q) => $q->where(fn ($q) => $q->where('e_cliente', true)->orWhere('e_potencial', true)))
            ->where(function ($q) use ($conta, $digitos) {
                $q->where('email', $conta->email);
                if ($conta->nuit) {
                    $q->orWhere('nuit', $conta->nuit);
                }
                if (strlen($digitos) === 9) {
                    // Compara só os 9 dígitos do número, seja qual for a forma como foi escrito
                    foreach (['telemovel', 'telefone'] as $campo) {
                        $q->orWhereRaw("REPLACE(REPLACE(REPLACE({$campo}, ' ', ''), '-', ''), '+', '') LIKE ?", ["%{$digitos}"]);
                    }
                }
            })
            ->orderBy('nome')
            ->limit(5)
            ->get();
    }

    /** Aprova: liga a uma ficha existente ($terceiroId) ou cria uma ficha nova com os dados da conta */
    public function aprovar(ContaCliente $conta, User $quem, ?int $terceiroId = null): ContaCliente
    {
        if (! in_array($conta->estado, [ContaCliente::PENDENTE, ContaCliente::RECUSADA], true)) {
            throw ValidationException::withMessages(['conta' => 'Esta conta já foi aprovada.']);
        }

        return DB::transaction(function () use ($conta, $quem, $terceiroId) {
            if ($terceiroId !== null) {
                $terceiro = Terceiro::findOrFail($terceiroId);
                if (! $terceiro->activo) {
                    throw ValidationException::withMessages(['terceiro_id' => "{$terceiro->nome} está encerrado."]);
                }
                if (! $terceiro->e_cliente) {
                    // Um potencial cliente que já reserva passa a cliente
                    $terceiro = $this->terceiros->actualizar($terceiro, ['e_cliente' => true]);
                }
            } else {
                $terceiro = $this->terceiros->criar([
                    'nome' => $conta->nome,
                    'e_cliente' => true,
                    'tipo_entidade' => 'particular',
                    'nuit' => $conta->nuit,
                    'email' => $conta->email,
                    'telemovel' => $conta->telemovel,
                    'provincia' => $conta->provincia,
                    'cidade' => $conta->cidade,
                    'morada' => collect([$conta->morada, $conta->bairro])->filter()->implode(', ') ?: null,
                    'pais' => 'MZ',
                    'termos_pagamento' => 'pronto',
                    'activo' => true,
                ], $quem);
            }

            $conta->terceiro_id = $terceiro->id;
            $conta->estado = ContaCliente::ACTIVA;
            $conta->motivo = null;
            $conta->aprovada_em = now();
            $conta->aprovada_por = $quem->id;
            $conta->save();

            activity('contas')->performedOn($conta)->causedBy($quem)->event('aprovada')
                ->log("Conta de cliente aprovada: {$conta->nome} → {$terceiro->nome}".($terceiroId ? ' (ficha existente)' : ' (ficha nova)'));

            return $conta;
        });
    }

    public function recusar(ContaCliente $conta, User $quem, ?string $motivo): ContaCliente
    {
        if ($conta->estado !== ContaCliente::PENDENTE) {
            throw ValidationException::withMessages(['conta' => 'Só se recusa uma conta por aprovar.']);
        }

        return $this->mudarEstado($conta, ContaCliente::RECUSADA, $motivo, $quem, 'Conta de cliente recusada');
    }

    /** Impede a entrada (ex.: cliente com pagamentos em atraso); pode ser reactivada */
    public function suspender(ContaCliente $conta, User $quem, ?string $motivo): ContaCliente
    {
        if ($conta->estado !== ContaCliente::ACTIVA) {
            throw ValidationException::withMessages(['conta' => 'Só se suspende uma conta activa.']);
        }

        return $this->mudarEstado($conta, ContaCliente::SUSPENSA, $motivo, $quem, 'Conta de cliente suspensa');
    }

    public function reactivar(ContaCliente $conta, User $quem): ContaCliente
    {
        if ($conta->estado !== ContaCliente::SUSPENSA) {
            throw ValidationException::withMessages(['conta' => 'Só se reactiva uma conta suspensa.']);
        }

        return $this->mudarEstado($conta, ContaCliente::ACTIVA, null, $quem, 'Conta de cliente reactivada');
    }

    private function mudarEstado(ContaCliente $conta, string $estado, ?string $motivo, User $quem, string $descricao): ContaCliente
    {
        $conta->estado = $estado;
        $conta->motivo = $motivo;
        $conta->save();

        activity('contas')->performedOn($conta)->causedBy($quem)->event($estado)
            ->log("{$descricao}: {$conta->nome}".($motivo ? " — {$motivo}" : ''));

        return $conta;
    }
}
