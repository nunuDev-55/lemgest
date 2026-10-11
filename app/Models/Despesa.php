<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/** Despesa do dia-a-dia (combustível, salários, renda...): valor pago, sem factura de fornecedor no LemGest */
class Despesa extends Model
{
    use LogsActivity;

    /** As compras de matéria-prima vêm das facturas de fornecedores; aqui ficam os outros gastos */
    public const CATEGORIAS = [
        'combustivel' => 'Combustível e transporte',
        'salarios' => 'Salários e ajudas',
        'renda' => 'Renda',
        'energia' => 'Energia e água',
        'comunicacoes' => 'Comunicações e internet',
        'manutencao' => 'Manutenção e reparações',
        'impostos' => 'Impostos e taxas',
        'outros' => 'Outros',
    ];

    protected $table = 'despesas';

    protected $fillable = ['data', 'categoria', 'descricao', 'valor', 'metodo', 'terceiro_id'];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'valor' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function categoriaNome(): string
    {
        return self::CATEGORIAS[$this->categoria] ?? $this->categoria;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('despesas')
            ->logOnly(['data', 'categoria', 'descricao', 'valor', 'metodo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Despesa registada',
                'updated' => 'Despesa alterada',
                'deleted' => 'Despesa apagada',
                default => $e,
            });
    }
}
