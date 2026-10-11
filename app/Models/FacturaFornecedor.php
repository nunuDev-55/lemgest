<?php

namespace App\Models;

use App\Contracts\DocumentoDeCompra;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Factura de fornecedor (o que a empresa deve pagar).
 * rascunho → validada (número interno FF2026/0001) → paga; validada sem pagamentos → abandonada.
 * Guarda sempre o número da factura do fornecedor (ref_fornecedor), único por fornecedor.
 */
class FacturaFornecedor extends Model implements DocumentoDeCompra
{
    public const RASCUNHO = 'rascunho';

    public const VALIDADA = 'validada';

    public const PAGA = 'paga';

    public const ABANDONADA = 'abandonada';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::VALIDADA => 'Por pagar',
        self::PAGA => 'Paga',
        self::ABANDONADA => 'Abandonada',
    ];

    protected $table = 'facturas_fornecedor';

    protected $fillable = [
        'terceiro_id', 'ref_fornecedor', 'data', 'data_vencimento', 'termos_pagamento', 'metodo_pagamento', 'nota_privada',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'data_vencimento' => 'date',
            'validada_em' => 'datetime',
            'total_sem_iva' => 'decimal:2',
            'total_iva' => 'decimal:2',
            'total' => 'decimal:2',
            'total_pago' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    /** @return BelongsTo<EncomendaFornecedor, $this> */
    public function encomenda(): BelongsTo
    {
        return $this->belongsTo(EncomendaFornecedor::class, 'encomenda_fornecedor_id');
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(FacturaFornecedorLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return BelongsToMany<PagamentoFornecedor, $this> */
    public function pagamentos(): BelongsToMany
    {
        return $this->belongsToMany(PagamentoFornecedor::class, 'factura_fornecedor_pagamento')->withPivot('valor')->withTimestamps();
    }

    /** @return BelongsTo<User, $this> */
    public function validadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validada_por');
    }

    public function referencia(): string
    {
        return $this->numero ?? "(PROV{$this->id})";
    }

    public function eRascunho(): bool
    {
        return $this->estado === self::RASCUNHO;
    }

    public function emFalta(): string
    {
        return bcsub((string) $this->total, (string) $this->total_pago, 2);
    }

    public function estaVencida(): bool
    {
        return $this->estado === self::VALIDADA && $this->data_vencimento !== null && $this->data_vencimento->isPast() && ! $this->data_vencimento->isToday();
    }
}
