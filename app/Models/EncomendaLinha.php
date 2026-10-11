<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncomendaLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'encomenda_linhas';

    /** @return BelongsTo<Encomenda, $this> */
    public function encomenda(): BelongsTo
    {
        return $this->belongsTo(Encomenda::class);
    }
}
