<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Foto de um produto. Cada foto existe em três tamanhos (grande, media, mini), em WebP,
 * guardados no disco "local" (fora da pasta pública) e servidos pelo ProdutoFotoController.
 */
class ProdutoFoto extends Model
{
    public const TAMANHOS = ['grande' => 1600, 'media' => 800, 'mini' => 320];

    protected $table = 'produto_fotos';

    protected $fillable = ['ficheiro', 'nome_original', 'largura', 'altura', 'bytes', 'principal', 'posicao'];

    protected function casts(): array
    {
        return ['principal' => 'boolean', 'posicao' => 'integer', 'largura' => 'integer', 'altura' => 'integer', 'bytes' => 'integer'];
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    /** Caminho no disco "local" de um dos tamanhos */
    public function caminho(string $tamanho): string
    {
        return "produtos/{$this->ficheiro}-{$tamanho}.webp";
    }

    /** Endereço para o navegador; muda quando a foto muda, para a cache não mostrar a antiga */
    public function url(string $tamanho = 'media'): string
    {
        return "/produtos/fotos/{$this->id}/{$tamanho}?v=".substr($this->ficheiro, -8);
    }

    /** @return array<string, mixed> */
    public function paraEcra(): array
    {
        return [
            'id' => $this->id,
            'mini' => $this->url('mini'),
            'media' => $this->url('media'),
            'grande' => $this->url('grande'),
            'nome' => $this->nome_original,
            'largura' => $this->largura,
            'altura' => $this->altura,
            'bytes' => $this->bytes,
            'principal' => $this->principal,
        ];
    }
}
