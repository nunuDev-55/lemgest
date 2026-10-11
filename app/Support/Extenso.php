<?php

namespace App\Support;

/**
 * Valores por extenso, em português, para os recibos: 2500.50 → "dois mil e quinhentos meticais e cinquenta centavos".
 * Vai até 999 999 999 999 (escala longa: mil milhões).
 */
final class Extenso
{
    private const UNIDADES = [
        '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
        'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove',
    ];

    private const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];

    private const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    public static function meticais(string $valor): string
    {
        $valor = Dinheiro::arredondar($valor);
        [$inteiros, $centavos] = array_map('intval', explode('.', $valor) + [1 => '0']);

        $partes = [];
        if ($inteiros > 0 || $centavos === 0) {
            // "um milhão de meticais", mas "um milhão e cem meticais"
            $de = $inteiros >= 1_000_000 && $inteiros % 1_000_000 === 0 ? ' de' : '';
            $partes[] = self::numero($inteiros).$de.' '.($inteiros === 1 ? 'metical' : 'meticais');
        }
        if ($centavos > 0) {
            $partes[] = self::numero($centavos).' '.($centavos === 1 ? 'centavo' : 'centavos');
        }

        return implode(' e ', $partes);
    }

    public static function numero(int $n): string
    {
        if ($n === 0) {
            return 'zero';
        }

        // Grupos de três algarismos, do maior para o menor: mil milhões, milhões, milhares, unidades
        $grupos = [
            [intdiv($n, 1_000_000_000) % 1000, fn (int $g) => $g === 1 ? 'mil milhões' : self::centena($g).' mil milhões'],
            [intdiv($n, 1_000_000) % 1000, fn (int $g) => $g === 1 ? 'um milhão' : self::centena($g).' milhões'],
            [intdiv($n, 1000) % 1000, fn (int $g) => $g === 1 ? 'mil' : self::centena($g).' mil'],
            [$n % 1000, fn (int $g) => self::centena($g)],
        ];
        $usados = array_values(array_filter($grupos, fn ($g) => $g[0] > 0));

        $texto = '';
        foreach ($usados as $i => [$valor, $nome]) {
            if ($i > 0) {
                // "e" antes do último grupo quando é menor do que 100 ou uma centena redonda: "mil e cinco", "dois mil e quinhentos"
                $ultimo = $i === count($usados) - 1;
                $texto .= $ultimo && ($valor < 100 || $valor % 100 === 0) ? ' e ' : ' ';
            }
            $texto .= $nome($valor);
        }

        return $texto;
    }

    /** 1 a 999 */
    private static function centena(int $n): string
    {
        if ($n === 100) {
            return 'cem';
        }
        $partes = [];
        if ($n >= 100) {
            $partes[] = self::CENTENAS[intdiv($n, 100)];
        }
        $resto = $n % 100;
        if ($resto > 0 && $resto < 20) {
            $partes[] = self::UNIDADES[$resto];
        } elseif ($resto >= 20) {
            $partes[] = self::DEZENAS[intdiv($resto, 10)].($resto % 10 ? ' e '.self::UNIDADES[$resto % 10] : '');
        }

        return implode(' e ', $partes);
    }
}
