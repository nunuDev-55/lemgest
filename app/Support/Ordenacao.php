<?php

namespace App\Support;

use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Http\Request;

/** Ordenação das listas por coluna (?ordem=nome&dir=desc), só por colunas permitidas. */
final class Ordenacao
{
    /**
     * @param  array<string, string>  $colunas  nome no URL => coluna SQL
     * @return array{ordem: string, dir: string}
     */
    public static function aplicar(Builder $query, Request $request, array $colunas, string $padrao, string $dirPadrao = 'asc'): array
    {
        $ordem = array_key_exists((string) $request->query('ordem'), $colunas) ? (string) $request->query('ordem') : $padrao;
        $dir = in_array($request->query('dir'), ['asc', 'desc'], true) ? (string) $request->query('dir') : $dirPadrao;

        $query->orderBy($colunas[$ordem], $dir);

        return ['ordem' => $ordem, 'dir' => $dir];
    }

    /** Registos por página escolhidos na lista (10 a 100). */
    public static function porPagina(Request $request, int $padrao = 20): int
    {
        $n = (int) $request->query('por_pagina', $padrao);

        return in_array($n, [10, 20, 50, 100], true) ? $n : $padrao;
    }
}
