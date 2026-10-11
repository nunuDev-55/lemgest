<?php

namespace App\Http\Controllers;

use App\Services\Resultados;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Resultados da empresa num período: só para a gestão (permissão resultados.ver) */
class ResultadosController extends Controller
{
    public const PERIODOS = [
        'mes' => 'Este mês',
        'mes_anterior' => 'Mês passado',
        'ano' => 'Este ano',
        'ano_anterior' => 'Ano passado',
        'datas' => 'Escolher datas',
    ];

    public function __invoke(Request $request, Resultados $resultados): Response
    {
        $filtros = $request->validate([
            'periodo' => ['nullable', 'in:'.implode(',', array_keys(self::PERIODOS))],
            'de' => ['nullable', 'required_if:periodo,datas', 'date'],
            'ate' => ['nullable', 'required_if:periodo,datas', 'date', 'after_or_equal:de'],
        ], ['ate.after_or_equal' => 'O fim tem de ser igual ou depois do início.']);

        $periodo = $filtros['periodo'] ?? 'ano';
        $hoje = CarbonImmutable::today();
        [$de, $ate] = match ($periodo) {
            'mes' => [$hoje->startOfMonth(), $hoje->endOfMonth()->startOfDay()],
            'mes_anterior' => [$hoje->subMonthNoOverflow()->startOfMonth(), $hoje->subMonthNoOverflow()->endOfMonth()->startOfDay()],
            'ano_anterior' => [$hoje->subYear()->startOfYear(), $hoje->subYear()->endOfYear()->startOfDay()],
            'datas' => [CarbonImmutable::parse($filtros['de']), CarbonImmutable::parse($filtros['ate'])],
            default => [$hoje->startOfYear(), $hoje->endOfYear()->startOfDay()],
        };

        return Inertia::render('resultados/index', [
            'periodo' => ['chave' => $periodo, 'de' => $de->toDateString(), 'ate' => $ate->toDateString()],
            'periodos' => collect(self::PERIODOS)->map(fn ($label, $valor) => ['valor' => $valor, 'label' => $label])->values(),
            ...$resultados->doPeriodo($de, $ate),
        ]);
    }
}
