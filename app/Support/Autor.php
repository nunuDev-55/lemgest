<?php

namespace App\Support;

use App\Models\ContaCliente;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Quem fez uma acção registada na auditoria: alguém da equipa (User) ou um cliente da loja (ContaCliente),
 * por exemplo um pedido de reserva feito no catálogo.
 */
final class Autor
{
    public static function nome(?Model $causer): string
    {
        return match (true) {
            $causer instanceof User => $causer->name,
            $causer instanceof ContaCliente => "{$causer->nome} (cliente, pela loja)",
            default => 'Sistema',
        };
    }
}
