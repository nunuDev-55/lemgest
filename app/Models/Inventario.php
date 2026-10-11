<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Contagem física do armazém; as diferenças viram ajustes de stock. */
class Inventario extends Model
{
    protected $table = 'inventarios';

    protected $fillable = ['data', 'nota', 'produtos_contados', 'diferencas'];

    protected function casts(): array
    {
        return ['data' => 'date', 'produtos_contados' => 'integer', 'diferencas' => 'integer'];
    }

    public function linhas(): HasMany
    {
        return $this->hasMany(InventarioLinha::class)->orderBy('referencia');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }
}
