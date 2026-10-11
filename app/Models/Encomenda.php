<?php

namespace App\Models;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use App\Models\Concerns\LinhasComDias;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Encomenda de venda.
 * rascunho → validada → entregue; validada → anulada. A marca "facturada" é independente do estado.
 */
class Encomenda extends Model implements DocumentoComDias, DocumentoComLinhas
{
    use LinhasComDias;

    public const RASCUNHO = 'rascunho';

    public const VALIDADA = 'validada';

    public const ENTREGUE = 'entregue';

    public const ANULADA = 'anulada';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::VALIDADA => 'Validada',
        self::ENTREGUE => 'Entregue',
        self::ANULADA => 'Anulada',
    ];

    protected $table = 'encomendas';

    protected $fillable = [
        'terceiro_id', 'data', 'data_entrega', 'termos_pagamento', 'metodo_pagamento', 'ref_cliente', 'nota_publica', 'nota_privada',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'data_entrega' => 'date',
            'validada_em' => 'datetime',
            'entregue_em' => 'datetime',
            'facturada' => 'boolean',
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

    /** @return BelongsTo<Orcamento, $this> */
    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(EncomendaLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return HasMany<Factura, $this> */
    public function facturas(): HasMany
    {
        return $this->hasMany(Factura::class);
    }

    /** @return BelongsTo<User, $this> */
    public function validadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validada_por');
    }

    public function eRascunho(): bool
    {
        return $this->estado === self::RASCUNHO;
    }

    public function referencia(): string
    {
        return $this->numero ?? "(PROV{$this->id})";
    }

    /** Encomenda validada cuja data prevista de entrega já passou */
    public function atrasada(): bool
    {
        return $this->estado === self::VALIDADA && $this->data_entrega !== null
            && $this->data_entrega->isPast() && ! $this->data_entrega->isToday();
    }
}
