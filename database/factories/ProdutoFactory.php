<?php

namespace Database\Factories;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Produto> */
class ProdutoFactory extends Factory
{
    protected $model = Produto::class;

    public function definition(): array
    {
        return [
            'referencia' => strtoupper(fake()->unique()->bothify('PRD-###??')),
            'tipo' => 'produto',
            'nome' => fake()->words(2, true),
            'preco' => '1500.00',
            'taxa_iva' => '16.00',
            'unidade' => 'un',
            'em_venda' => true,
            'em_compra' => true,
        ];
    }
}
