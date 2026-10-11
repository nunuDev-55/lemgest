<?php

namespace App\Models;

use App\Models\Concerns\LinhaDeDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrcamentoLinha extends Model
{
    use LinhaDeDocumento;

    protected $table = 'orcamento_linhas';

    /** @return BelongsTo<Orcamento, $this> */
    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }
}
