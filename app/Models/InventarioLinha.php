<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioLinha extends Model
{
    public $timestamps = false;

    protected $table = 'inventario_linhas';

    protected $fillable = ['produto_id', 'referencia', 'nome', 'esperado', 'contado', 'diferenca'];

    protected function casts(): array
    {
        return ['esperado' => 'integer', 'contado' => 'integer', 'diferenca' => 'integer'];
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
