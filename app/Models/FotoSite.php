<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Foto do site (eventos montados pela LemServ): galeria, capa e outras imagens das páginas públicas.
 * Gerida em Administração → Site e galeria; guardada em três tamanhos WebP no disco "local".
 */
class FotoSite extends Model
{
    use LogsActivity;

    public const TAMANHOS = ['grande' => 1600, 'media' => 800, 'mini' => 320];

    public const MAXIMO = 60;

    /** Quantas fotos vão alternando na capa da página inicial */
    public const MAXIMO_CAPA = 6;

    protected $table = 'fotos_site';

    protected $fillable = ['ficheiro', 'legenda', 'largura', 'altura', 'bytes', 'capa', 'visivel', 'posicao'];

    protected function casts(): array
    {
        return [
            'capa' => 'boolean',
            'visivel' => 'boolean',
            'posicao' => 'integer',
            'largura' => 'integer',
            'altura' => 'integer',
            'bytes' => 'integer',
        ];
    }

    /** @param Builder<FotoSite> $query */
    public function scopeOrdenadas(Builder $query): void
    {
        $query->orderBy('posicao')->orderBy('id');
    }

    public function caminho(string $tamanho): string
    {
        return "site/{$this->ficheiro}-{$tamanho}.webp";
    }

    /** Endereço público (só serve fotos visíveis, ou à equipa que gere o site) */
    public function url(string $tamanho = 'media'): string
    {
        return "/catalogo/galeria/{$this->id}/{$tamanho}?v=".substr($this->ficheiro, -8);
    }

    /** @return array{id: int, legenda: string, grande: string, media: string, capa: bool, horizontal: bool} */
    public function paraSite(): array
    {
        return [
            'id' => $this->id,
            'legenda' => $this->legenda,
            'grande' => $this->url('grande'),
            'media' => $this->url('media'),
            'capa' => $this->capa,
            'horizontal' => $this->largura >= $this->altura,
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('site')
            ->logOnly(['legenda', 'capa', 'visivel'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Foto do site adicionada',
                'updated' => 'Foto do site alterada',
                'deleted' => 'Foto do site apagada',
                default => $e,
            });
    }
}
