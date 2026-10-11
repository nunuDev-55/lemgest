<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Um movimento de stock. Nunca se altera nem apaga: um engano corrige-se com outro movimento.
 * delta_total mexe nas peças que a LemServ tem; delta_fora nas que estão fora (alugadas).
 */
class MovimentoStock extends Model
{
    public const INICIAL = 'inicial';

    public const ENTRADA = 'entrada';

    public const SAIDA = 'saida';

    public const DEVOLUCAO = 'devolucao';

    public const ABATE = 'abate';

    public const AJUSTE = 'ajuste';

    public const ANULACAO = 'anulacao';

    public const TIPOS = [
        self::INICIAL => 'Quantidade inicial',
        self::ENTRADA => 'Entrada',
        self::SAIDA => 'Saída para aluguer',
        self::DEVOLUCAO => 'Devolução',
        self::ABATE => 'Perda ou dano',
        self::AJUSTE => 'Ajuste de inventário',
        self::ANULACAO => 'Entrada anulada',
    ];

    protected $table = 'movimentos_stock';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'devolucao_prevista' => 'date',
            'quantidade' => 'integer',
            'delta_total' => 'integer',
            'delta_fora' => 'integer',
            'total_depois' => 'integer',
            'fora_depois' => 'integer',
            'pendente' => 'integer',
        ];
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function origem(): MorphTo
    {
        return $this->morphTo();
    }

    /** A saída a que esta devolução (ou perda) se refere */
    public function saida(): BelongsTo
    {
        return $this->belongsTo(self::class, 'saida_id');
    }

    /** Devoluções e perdas registadas contra esta saída */
    public function regressos(): HasMany
    {
        return $this->hasMany(self::class, 'saida_id');
    }

    /** Saída com peças ainda fora e com a data prevista de devolução já passada */
    public function atrasada(): bool
    {
        return $this->tipo === self::SAIDA && $this->pendente > 0 && $this->devolucao_prevista !== null && $this->devolucao_prevista->isBefore(today());
    }

    /** @return array<string, mixed> */
    public function paraEcra(): array
    {
        $origem = $this->origem;

        return [
            'id' => $this->id,
            'tipo' => $this->tipo,
            'tipo_nome' => self::TIPOS[$this->tipo] ?? $this->tipo,
            'quantidade' => $this->quantidade,
            'delta_total' => $this->delta_total,
            'delta_fora' => $this->delta_fora,
            'total_depois' => $this->total_depois,
            'fora_depois' => $this->fora_depois,
            'data' => $this->data->toDateString(),
            'devolucao_prevista' => $this->devolucao_prevista?->toDateString(),
            'pendente' => $this->pendente,
            'atrasada' => $this->atrasada(),
            'saida_id' => $this->saida_id,
            'terceiro' => $this->terceiro ? ['id' => $this->terceiro->id, 'nome' => $this->terceiro->nome] : null,
            'motivo' => $this->motivo,
            'origem' => match (true) {
                $origem instanceof EncomendaFornecedor => ['label' => $origem->referencia(), 'href' => "/encomendas-fornecedor/{$origem->id}"],
                $origem instanceof Reserva => ['label' => "Reserva {$origem->numero}", 'href' => "/reservas/{$origem->id}"],
                $origem instanceof Inventario => ['label' => "Inventário de {$origem->data->format('d/m/Y')}", 'href' => "/stock/inventarios/{$origem->id}"],
                default => null,
            },
            'utilizador' => $this->autor?->name ?? 'Sistema',
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
