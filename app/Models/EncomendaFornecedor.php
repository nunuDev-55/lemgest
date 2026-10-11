<?php

namespace App\Models;

use App\Contracts\DocumentoDeCompra;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Encomenda a fornecedor.
 * rascunho → validada → encomendada (enviada ao fornecedor) → recebida; validada/encomendada → anulada.
 * A marca "facturada" é independente do estado.
 */
class EncomendaFornecedor extends Model implements DocumentoDeCompra
{
    public const RASCUNHO = 'rascunho';

    public const VALIDADA = 'validada';

    public const ENCOMENDADA = 'encomendada';

    public const RECEBIDA = 'recebida';

    public const ANULADA = 'anulada';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::VALIDADA => 'Validada',
        self::ENCOMENDADA => 'Encomendada',
        self::RECEBIDA => 'Recebida',
        self::ANULADA => 'Anulada',
    ];

    /** Como a encomenda foi feita ao fornecedor */
    public const MEIOS = [
        'email' => 'E-mail',
        'whatsapp' => 'WhatsApp',
        'telefone' => 'Telefone',
        'presencial' => 'Presencial',
    ];

    protected $table = 'encomendas_fornecedor';

    protected $fillable = [
        'terceiro_id', 'data', 'data_entrega', 'termos_pagamento', 'metodo_pagamento', 'ref_fornecedor', 'nota_publica', 'nota_privada',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'data_entrega' => 'date',
            'validada_em' => 'datetime',
            'encomendada_em' => 'date',
            'recebida_em' => 'datetime',
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

    public function linhas(): HasMany
    {
        return $this->hasMany(EncomendaFornecedorLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return HasMany<FacturaFornecedor, $this> */
    public function facturas(): HasMany
    {
        return $this->hasMany(FacturaFornecedor::class);
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

    /** Encomendada ao fornecedor e ainda não recebida depois da data prevista */
    public function atrasada(): bool
    {
        return $this->estado === self::ENCOMENDADA && $this->data_entrega !== null
            && $this->data_entrega->isPast() && ! $this->data_entrega->isToday();
    }
}
