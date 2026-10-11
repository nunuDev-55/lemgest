<?php

namespace App\Models;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use App\Models\Concerns\LinhasComDias;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Factura a cliente.
 *
 * Ciclo de vida (igual ao Dolibarr): rascunho → validada (pendente de cobrança) → paga,
 * ou validada → abandonada. Só o rascunho se pode alterar ou apagar.
 */
class Factura extends Model implements DocumentoComDias, DocumentoComLinhas
{
    use HasFactory, LinhasComDias;

    public const RASCUNHO = 'rascunho';

    public const VALIDADA = 'validada';

    public const PAGA = 'paga';

    public const ABANDONADA = 'abandonada';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::VALIDADA => 'Pendente de cobrança',
        self::PAGA => 'Paga',
        self::ABANDONADA => 'Abandonada',
    ];

    /** Expressão SQL equivalente a emFalta(), para somas nas listas e no Início */
    public const SQL_EM_FALTA = 'facturas.total - facturas.total_pago - facturas.total_creditado';

    protected $table = 'facturas';

    protected $fillable = [
        'tipo', 'terceiro_id', 'data', 'data_vencimento', 'termos_pagamento', 'metodo_pagamento',
        'ref_cliente', 'nota_publica', 'nota_privada',
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
            'total_creditado' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(FacturaLinha::class)->orderBy('posicao')->orderBy('id');
    }

    /** @return BelongsToMany<Pagamento, $this> */
    public function pagamentos(): BelongsToMany
    {
        return $this->belongsToMany(Pagamento::class, 'factura_pagamento')->withPivot('valor')->withTimestamps();
    }

    /** @return HasMany<NotaCredito, $this> */
    public function notasCredito(): HasMany
    {
        return $this->hasMany(NotaCredito::class);
    }

    /** @return BelongsTo<Orcamento, $this> */
    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    /** @return BelongsTo<Encomenda, $this> */
    public function encomenda(): BelongsTo
    {
        return $this->belongsTo(Encomenda::class);
    }

    /** Reserva de aluguer de onde a factura veio */
    public function reserva(): BelongsTo
    {
        return $this->belongsTo(Reserva::class);
    }

    /** @return BelongsTo<User, $this> */
    public function validadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validada_por');
    }

    /** Referência mostrada: o número definitivo ou "(PROV12)" enquanto é rascunho */
    public function referencia(): string
    {
        return $this->numero ?? "(PROV{$this->id})";
    }

    public function eRascunho(): bool
    {
        return $this->estado === self::RASCUNHO;
    }

    /** O que falta pagar: total − pagamentos − notas de crédito abatidas */
    public function emFalta(): string
    {
        return bcsub(bcsub((string) $this->total, (string) $this->total_pago, 2), (string) $this->total_creditado, 2);
    }

    /** Quanto ainda se pode creditar: o total menos as notas de crédito já validadas */
    public function creditavel(): string
    {
        $creditado = (string) $this->notasCredito()->where('estado', '!=', NotaCredito::RASCUNHO)->sum('total');

        return bcsub((string) $this->total, bcadd($creditado, '0', 2), 2);
    }

    public function estaVencida(): bool
    {
        return $this->estado === self::VALIDADA && $this->data_vencimento !== null && $this->data_vencimento->isPast() && ! $this->data_vencimento->isToday();
    }
}
