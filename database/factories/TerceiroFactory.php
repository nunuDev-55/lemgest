<?php

namespace Database\Factories;

use App\Models\Terceiro;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Terceiro> */
class TerceiroFactory extends Factory
{
    protected $model = Terceiro::class;

    public function definition(): array
    {
        return [
            'nome' => fake()->company(),
            'e_cliente' => true,
            'e_potencial' => false,
            'e_fornecedor' => false,
            'tipo_entidade' => 'empresa',
            'nuit' => (string) fake()->numberBetween(100000000, 999999999),
            'sujeito_iva' => true,
            'cidade' => 'Maputo',
            'provincia' => 'MZ-MPM',
            'pais' => 'MZ',
            'telefone' => '84 '.fake()->numberBetween(100, 999).' '.fake()->numberBetween(1000, 9999),
            'termos_pagamento' => 'pronto',
            'activo' => true,
        ];
    }

    public function fornecedor(): static
    {
        return $this->state(['e_cliente' => false, 'e_fornecedor' => true]);
    }
}
