<?php

namespace App\Models;

use App\Support\Opcoes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Cliente, potencial cliente e/ou fornecedor.
 *
 * @property bool $e_cliente
 * @property bool $e_potencial
 * @property bool $e_fornecedor
 */
class Terceiro extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'terceiros';

    protected $fillable = [
        'nome', 'nome_alternativo', 'e_cliente', 'e_potencial', 'e_fornecedor',
        'tipo_entidade', 'nuit', 'sujeito_iva', 'morada', 'codigo_postal', 'cidade', 'provincia', 'pais',
        'telefone', 'telemovel', 'email', 'website', 'termos_pagamento', 'metodo_pagamento',
        'nota_publica', 'nota_privada', 'activo',
    ];

    protected function casts(): array
    {
        return [
            'e_cliente' => 'boolean',
            'e_potencial' => 'boolean',
            'e_fornecedor' => 'boolean',
            'sujeito_iva' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('terceiros')
            ->logOnly(['nome', 'nuit', 'e_cliente', 'e_potencial', 'e_fornecedor', 'telefone', 'email', 'activo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => 'Terceiro criado',
                'updated' => 'Terceiro alterado',
                'deleted' => 'Terceiro apagado',
                default => $e,
            });
    }

    /** @return HasMany<Factura, $this> */
    public function facturas(): HasMany
    {
        return $this->hasMany(Factura::class);
    }

    /** @return HasMany<Contacto, $this> */
    public function contactos(): HasMany
    {
        return $this->hasMany(Contacto::class)->orderBy('nome');
    }

    /** @return HasMany<Orcamento, $this> */
    public function orcamentos(): HasMany
    {
        return $this->hasMany(Orcamento::class);
    }

    /** @return HasMany<Encomenda, $this> */
    public function encomendas(): HasMany
    {
        return $this->hasMany(Encomenda::class);
    }

    /** @return HasMany<EncomendaFornecedor, $this> */
    /** Contas na loja ligadas a esta ficha (pode haver várias pessoas da mesma empresa) */
    public function contasCliente(): HasMany
    {
        return $this->hasMany(ContaCliente::class);
    }

    /** Reservas de aluguer deste cliente */
    public function reservas(): HasMany
    {
        return $this->hasMany(Reserva::class);
    }

    public function encomendasFornecedor(): HasMany
    {
        return $this->hasMany(EncomendaFornecedor::class);
    }

    /** @return HasMany<FacturaFornecedor, $this> */
    public function facturasFornecedor(): HasMany
    {
        return $this->hasMany(FacturaFornecedor::class);
    }

    /** @param Builder<Terceiro> $query */
    public function scopeClientes(Builder $query): void
    {
        $query->where('e_cliente', true);
    }

    /** @return list<string> Rótulos curtos para mostrar na lista: Cliente, Potencial, Fornecedor */
    public function natureza(): array
    {
        return array_values(array_filter([
            $this->e_cliente ? 'Cliente' : null,
            $this->e_potencial ? 'Potencial' : null,
            $this->e_fornecedor ? 'Fornecedor' : null,
        ]));
    }

    public function provinciaNome(): ?string
    {
        return $this->provincia ? (Opcoes::PROVINCIAS[$this->provincia] ?? $this->provincia) : null;
    }
}
