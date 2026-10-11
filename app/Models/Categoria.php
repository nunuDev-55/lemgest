<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/** Categoria de produtos (Lounge, Tendas, Mesas e cadeiras...), usada nas listas e na loja. */
class Categoria extends Model
{
    use LogsActivity;

    protected $table = 'categorias';

    protected $fillable = ['nome', 'descricao', 'ordem'];

    protected function casts(): array
    {
        return ['ordem' => 'integer'];
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('produtos')
            ->logOnly(['nome', 'descricao'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Categoria criada',
                'updated' => 'Categoria alterada',
                'deleted' => 'Categoria apagada',
                default => $e,
            });
    }
}
