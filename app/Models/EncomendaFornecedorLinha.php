<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncomendaFornecedorLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'encomenda_fornecedor_linhas';

    /** @return BelongsTo<EncomendaFornecedor, $this> */
    public function encomenda(): BelongsTo
    {
        return $this->belongsTo(EncomendaFornecedor::class, 'encomenda_fornecedor_id');
    }
}
