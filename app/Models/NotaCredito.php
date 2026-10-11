<?php

namespace App\Models;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use App\Models\Concerns\LinhasComDias;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Nota de crédito a cliente: corrige (no todo ou em parte) uma factura validada.
 *
 * rascunho → validada (recebe NC2026/0001 e abate no que falta pagar da factura).
 * Se a factura já estava paga, o excedente fica "por reembolsar" até se registar o reembolso;
 * sem nada a reembolsar, a nota fica logo fechada.
 */
class NotaCredito extends Model implements DocumentoComDias, DocumentoComLinhas
{
    use LinhasComDias;

    public const RASCUNHO = 'rascunho';

    public const VALIDADA = 'validada';

    public const FECHADA = 'fechada';

    public const ESTADOS = [
        self::RASCUNHO => 'Rascunho',
        self::VALIDADA => 'Por reembolsar',
        self::FECHADA => 'Fechada',
    ];

    /** Motivos mais comuns, sugeridos no formulário */
    public const MOTIVOS = [
        'Devolução de material',
        'Serviço não prestado ou cancelado',
        'Desconto concedido depois da factura',
        'Erro de preço ou de quantidade na factura',
        'Anulação da factura',
    ];

    protected $table = 'notas_credito';

    protected $fillable = ['data', 'motivo', 'nota_publica', 'nota_privada'];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'reembolsado_em' => 'date',
            'validada_em' => 'datetime',
            'total_sem_iva' => 'decimal:2',
            'total_iva' => 'decimal:2',
            'total' => 'decimal:2',
            'valor_abatido' => 'decimal:2',
            'valor_reembolso' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Factura, $this> */
    public function factura(): BelongsTo
    {
        return $this->belongsTo(Factura::class);
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(NotaCreditoLinha::class)->orderBy('posicao')->orderBy('id');
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

    public function porReembolsar(): bool
    {
        return $this->estado === self::VALIDADA && bccomp((string) $this->valor_reembolso, '0', 2) > 0;
    }
}
