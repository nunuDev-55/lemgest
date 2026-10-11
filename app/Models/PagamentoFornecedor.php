<?php

namespace App\Models;

use App\Support\Opcoes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Pagamento feito a um fornecedor (PF2026/0001). */
class PagamentoFornecedor extends Model
{
    protected $table = 'pagamentos_fornecedor';

    protected $fillable = ['terceiro_id', 'data', 'metodo', 'numero_documento', 'comentario', 'valor'];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'valor' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    /** @return BelongsToMany<FacturaFornecedor, $this> */
    public function facturas(): BelongsToMany
    {
        return $this->belongsToMany(FacturaFornecedor::class, 'factura_fornecedor_pagamento')->withPivot('valor')->withTimestamps();
    }

    public function metodoNome(): string
    {
        return Opcoes::METODOS_PAGAMENTO[$this->metodo] ?? $this->metodo;
    }
}
