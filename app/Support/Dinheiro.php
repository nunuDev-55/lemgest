<?php

namespace App\Support;

/**
 * Contas com dinheiro feitas com bcmath (texto), nunca com float,
 * para não haver erros de arredondamento nos cêntimos.
 */
final class Dinheiro
{
    /** Arredonda a 2 casas decimais (meio para cima). */
    public static function arredondar(string $valor, int $casas = 2): string
    {
        $ajuste = '0.'.str_repeat('0', $casas).'5';
        $resultado = str_starts_with($valor, '-')
            ? bcsub($valor, $ajuste, $casas)
            : bcadd($valor, $ajuste, $casas);

        return bcadd($resultado, '0', $casas);
    }

    /**
     * Totais de uma linha de factura.
     *
     * @return array{total_sem_iva: string, total_iva: string, total: string}
     */
    public static function linha(string $quantidade, string $precoUnitario, string $desconto, string $taxaIva): array
    {
        $bruto = bcmul($quantidade, $precoUnitario, 8);
        $factorDesconto = bcsub('1', bcdiv($desconto, '100', 8), 8);
        $semIva = self::arredondar(bcmul($bruto, $factorDesconto, 8));
        $iva = self::arredondar(bcdiv(bcmul($semIva, $taxaIva, 8), '100', 8));

        return [
            'total_sem_iva' => $semIva,
            'total_iva' => $iva,
            'total' => bcadd($semIva, $iva, 2),
        ];
    }

    /** Valor vindo de um SUM() da base de dados → texto com 2 casas ("1740" e "1740.00" ficam iguais). */
    public static function normalizar(mixed $valor): string
    {
        return bcadd((string) ($valor ?? '0'), '0', 2);
    }

    /** @param iterable<string|int|float> $valores */
    public static function somar(iterable $valores): string
    {
        $soma = '0.00';
        foreach ($valores as $v) {
            $soma = bcadd($soma, (string) $v, 2);
        }

        return $soma;
    }
}
