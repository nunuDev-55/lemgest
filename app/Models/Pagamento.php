<?php

namespace App\Models;

use App\Support\Opcoes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Pagamento extends Model
{
    protected $table = 'pagamentos';

    protected $fillable = ['terceiro_id', 'data', 'metodo', 'numero_documento', 'remetente', 'comentario', 'valor'];

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

    /** @return BelongsToMany<Factura, $this> */
    public function facturas(): BelongsToMany
    {
        return $this->belongsToMany(Factura::class, 'factura_pagamento')->withPivot('valor')->withTimestamps();
    }

    public function metodoNome(): string
    {
        return Opcoes::METODOS_PAGAMENTO[$this->metodo] ?? $this->metodo;
    }
}
