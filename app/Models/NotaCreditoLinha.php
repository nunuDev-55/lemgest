<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotaCreditoLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'nota_credito_linhas';

    /** @return BelongsTo<NotaCredito, $this> */
    public function notaCredito(): BelongsTo
    {
        return $this->belongsTo(NotaCredito::class);
    }
}
