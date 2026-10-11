<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/** Pessoa de contacto de um terceiro (Contactos / Endereços no Dolibarr). */
class Contacto extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'contactos';

    protected $fillable = ['terceiro_id', 'nome', 'cargo', 'telefone', 'telemovel', 'email', 'nota', 'activo'];

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('terceiros')
            ->logOnly(['nome', 'cargo', 'telefone', 'telemovel', 'email', 'activo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Contacto criado',
                'updated' => 'Contacto alterado',
                'deleted' => 'Contacto apagado',
                default => $e,
            });
    }
}
