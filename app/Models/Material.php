<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/** Material do produto (Napa, Tecido, Lã...): filtro nas listas e no catálogo. */
class Material extends Model
{
    use LogsActivity;

    protected $table = 'materiais';

    protected $fillable = ['nome', 'ordem'];

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
            ->logOnly(['nome'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Material criado',
                'updated' => 'Material alterado',
                'deleted' => 'Material apagado',
                default => $e,
            });
    }
}
