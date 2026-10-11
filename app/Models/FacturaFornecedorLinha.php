<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacturaFornecedorLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'factura_fornecedor_linhas';

    /** @return BelongsTo<FacturaFornecedor, $this> */
    public function factura(): BelongsTo
    {
        return $this->belongsTo(FacturaFornecedor::class, 'factura_fornecedor_id');
    }
}
