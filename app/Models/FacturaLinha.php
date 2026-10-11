<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacturaLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'factura_linhas';

    /** @return BelongsTo<Factura, $this> */
    public function factura(): BelongsTo
    {
        return $this->belongsTo(Factura::class);
    }
}
