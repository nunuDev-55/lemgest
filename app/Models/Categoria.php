<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Categoria de produtos (Sofás, Puffs, Tendas...), usada nas listas e na loja.
 * O código (SOF, PUF...) dá o código automático dos produtos novos: SOF-001, SOF-002...
 */
class Categoria extends Model
{
    use LogsActivity;

    protected $table = 'categorias';

    protected $fillable = ['nome', 'codigo', 'descricao', 'ordem'];

    protected function casts(): array
    {
        return ['ordem' => 'integer'];
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class);
    }

    /** Próximo código livre nesta categoria (SOF-001, SOF-002...); null se a categoria não tiver código */
    public function proximoCodigoProduto(): ?string
    {
        if (! $this->codigo) {
            return null;
        }
        $prefixo = $this->codigo.'-';
        $maior = Produto::where('referencia', 'like', $prefixo.'%')->pluck('referencia')
            ->map(fn (string $r) => preg_match('/^'.preg_quote($prefixo, '/').'(\d+)$/', $r, $m) ? (int) $m[1] : 0)
            ->max() ?? 0;

        return $prefixo.str_pad((string) ($maior + 1), 3, '0', STR_PAD_LEFT);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('produtos')
            ->logOnly(['nome', 'codigo', 'descricao'])
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
