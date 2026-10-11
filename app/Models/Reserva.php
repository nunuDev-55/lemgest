<?php

namespace App\Models;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Reserva de aluguer (AL2026/0001).
 *
 * pedido → confirmada (o material fica preso para as datas) → entregue (o stock sai) → devolvida (o stock voltou todo).
 * pedido ou confirmada → cancelada. Até à entrega, as linhas e as datas podem mudar.
 */
class Reserva extends Model implements DocumentoComDias, DocumentoComLinhas
{
    public const PEDIDO = 'pedido';

    public const CONFIRMADA = 'confirmada';

    public const ENTREGUE = 'entregue';

    public const DEVOLVIDA = 'devolvida';

    public const CANCELADA = 'cancelada';

    public const ESTADOS = [
        self::PEDIDO => 'Pedido',
        self::CONFIRMADA => 'Confirmada',
        self::ENTREGUE => 'Entregue',
        self::DEVOLVIDA => 'Devolvida',
        self::CANCELADA => 'Cancelada',
    ];

    protected $table = 'reservas';

    protected $fillable = [
        'terceiro_id', 'data_evento', 'data_fim_evento', 'data_entrega', 'data_recolha', 'dias',
        'local', 'contacto_local', 'transporte', 'tema', 'nota_publica', 'nota_privada',
    ];

    protected function casts(): array
    {
        return [
            'data_evento' => 'date',
            'data_fim_evento' => 'date',
            'data_entrega' => 'date',
            'data_recolha' => 'date',
            'dias' => 'integer',
            'transporte' => 'boolean',
            'confirmada_em' => 'datetime',
            'entregue_em' => 'datetime',
            'devolvida_em' => 'datetime',
            'cancelada_em' => 'datetime',
            'total_sem_iva' => 'decimal:2',
            'total_iva' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(ReservaLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return BelongsTo<Orcamento, $this> */
    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    /** @return HasMany<Factura, $this> */
    public function facturas(): HasMany
    {
        return $this->hasMany(Factura::class);
    }

    /** Já tem factura (que não foi abandonada) */
    public function facturada(): bool
    {
        return $this->facturas()->where('estado', '!=', Factura::ABANDONADA)->exists();
    }

    /** @return BelongsTo<User, $this> */
    public function confirmadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmada_por');
    }

    /** As linhas e as datas só mudam antes de o material sair */
    public function eRascunho(): bool
    {
        return in_array($this->estado, [self::PEDIDO, self::CONFIRMADA], true);
    }

    /** O material de aluguer leva os dias da reserva; serviços e material vendido, 1 */
    public function diasPropostos(?Produto $produto): int
    {
        return $produto?->tipo === 'produto' && $produto->em_aluguer ? max(1, $this->dias) : 1;
    }

    public function referencia(): string
    {
        return $this->numero;
    }

    /** Entregue e a data de recolha já passou sem o material ter voltado todo */
    public function recolhaAtrasada(): bool
    {
        return $this->estado === self::ENTREGUE && $this->data_recolha->isBefore(today());
    }

    /** Reservas que prendem material: confirmadas (ainda não saíram) */
    public function scopeQuePrendem(Builder $query): Builder
    {
        return $query->where('estado', self::CONFIRMADA);
    }
}
