<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Linha de uma reserva: quantidade × dias × preço por dia, menos o desconto */
class ReservaLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'reserva_linhas';

    /** @return BelongsTo<Reserva, $this> */
    public function reserva(): BelongsTo
    {
        return $this->belongsTo(Reserva::class);
    }

    /** A saída de stock feita quando o material foi entregue */
    public function movimentoSaida(): BelongsTo
    {
        return $this->belongsTo(MovimentoStock::class, 'movimento_saida_id');
    }

    /** Linha de material com stock (produto, não serviço) */
    public function temStock(): bool
    {
        return $this->produto?->tipo === 'produto';
    }

    /** Quantidade em peças (as linhas de material têm sempre quantidades inteiras) */
    public function pecas(): int
    {
        return (int) $this->quantidade;
    }
}
