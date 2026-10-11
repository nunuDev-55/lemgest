<?php

namespace App\Models;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use App\Models\Concerns\LinhasComDias;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Orçamento (proposta comercial).
 * rascunho → aberto (validado) → assinado → facturado; ou aberto → recusado (não assinado).
 */
class Orcamento extends Model implements DocumentoComDias, DocumentoComLinhas
{
    use LinhasComDias;

    public const RASCUNHO = 'rascunho';

    public const ABERTO = 'aberto';

    public const ASSINADO = 'assinado';

    public const RECUSADO = 'recusado';

    public const FACTURADO = 'facturado';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::ABERTO => 'Aberto',
        self::ASSINADO => 'Assinado (por facturar)',
        self::RECUSADO => 'Não assinado',
        self::FACTURADO => 'Facturado',
    ];

    protected $table = 'orcamentos';

    protected $fillable = [
        'terceiro_id', 'data', 'validade_dias', 'data_entrega', 'termos_pagamento', 'metodo_pagamento',
        'ref_cliente', 'nota_publica', 'nota_privada',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'data_fim_validade' => 'date',
            'data_entrega' => 'date',
            'validado_em' => 'datetime',
            'fechado_em' => 'datetime',
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
        return $this->hasMany(OrcamentoLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return HasMany<Encomenda, $this> */
    public function encomendas(): HasMany
    {
        return $this->hasMany(Encomenda::class);
    }

    /** @return HasMany<Factura, $this> */
    public function facturas(): HasMany
    {
        return $this->hasMany(Factura::class);
    }

    /** Reservas criadas a partir deste orçamento */
    public function reservas(): HasMany
    {
        return $this->hasMany(Reserva::class);
    }

    /** @return BelongsTo<User, $this> */
    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }

    public function eRascunho(): bool
    {
        return $this->estado === self::RASCUNHO;
    }

    public function referencia(): string
    {
        return $this->numero ?? "(PROV{$this->id})";
    }

    /** Orçamento aberto cuja validade já passou */
    public function expirado(): bool
    {
        return $this->estado === self::ABERTO && $this->data_fim_validade !== null
            && $this->data_fim_validade->isPast() && ! $this->data_fim_validade->isToday();
    }
}
