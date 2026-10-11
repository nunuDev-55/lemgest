<?php

namespace App\Services;

use App\Models\Despesa;
use App\Models\Factura;
use App\Models\FacturaFornecedor;
use App\Models\FacturaLinha;
use App\Models\NotaCredito;
use App\Models\Pagamento;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Resultados de um período (página só para a gestão).
 *
 * - Facturado: facturas validadas ou pagas com data no período, menos as notas de crédito do período (valores sem IVA).
 * - Recebido: pagamentos de clientes com data no período.
 * - Por receber: o que ainda falta pagar das facturas do período.
 * - Compras: facturas de fornecedores (matéria-prima) validadas ou pagas com data no período (sem IVA).
 * - Despesas: gastos do dia-a-dia registados com data no período (valor pago).
 * - Ganhos = facturado; gastos = compras + despesas; resultado = ganhos − gastos.
 *
 * As somas fazem-se em PHP, para darem o mesmo em MariaDB e nos testes (SQLite).
 */
class Resultados
{
    /** @return array<string, mixed> */
    public function doPeriodo(CarbonImmutable $de, CarbonImmutable $ate): array
    {
        $facturas = Factura::query()
            ->whereIn('estado', [Factura::VALIDADA, Factura::PAGA])
            ->whereDate('data', '>=', $de->toDateString())->whereDate('data', '<=', $ate->toDateString())
            ->with('terceiro:id,nome')
            ->orderByDesc('data')->orderByDesc('numero')
            ->get();
        $notas = NotaCredito::where('estado', '!=', NotaCredito::RASCUNHO)
            ->whereDate('data', '>=', $de->toDateString())->whereDate('data', '<=', $ate->toDateString())
            ->get(['id', 'terceiro_id', 'data', 'total_sem_iva', 'total']);
        $pagamentos = Pagamento::whereDate('data', '>=', $de->toDateString())->whereDate('data', '<=', $ate->toDateString())
            ->get(['id', 'terceiro_id', 'data', 'valor']);
        $compras = FacturaFornecedor::whereIn('estado', [FacturaFornecedor::VALIDADA, FacturaFornecedor::PAGA])
            ->whereDate('data', '>=', $de->toDateString())->whereDate('data', '<=', $ate->toDateString())
            ->get(['id', 'data', 'total_sem_iva']);
        $despesas = Despesa::whereDate('data', '>=', $de->toDateString())->whereDate('data', '<=', $ate->toDateString())
            ->get(['id', 'data', 'categoria', 'valor']);

        $soma = fn (Collection $c, string $campo) => $c->reduce(fn (string $t, $x) => bcadd($t, (string) $x->{$campo}, 2), '0.00');

        $facturado = bcsub($soma($facturas, 'total_sem_iva'), $soma($notas, 'total_sem_iva'), 2);
        $totalCompras = $soma($compras, 'total_sem_iva');
        $totalDespesas = $soma($despesas, 'valor');
        $gastos = bcadd($totalCompras, $totalDespesas, 2);

        return [
            'resumo' => [
                'facturado' => $facturado,
                'facturado_bruto' => $soma($facturas, 'total_sem_iva'),
                'notas_credito' => $soma($notas, 'total_sem_iva'),
                'facturado_com_iva' => bcsub($soma($facturas, 'total'), $soma($notas, 'total'), 2),
                'n_facturas' => $facturas->count(),
                'recebido' => $soma($pagamentos, 'valor'),
                'por_receber' => $facturas->where('estado', Factura::VALIDADA)->reduce(fn (string $t, Factura $f) => bcadd($t, $f->emFalta(), 2), '0.00'),
                'compras' => $totalCompras,
                'despesas' => $totalDespesas,
                'gastos' => $gastos,
                'resultado' => bcsub($facturado, $gastos, 2),
            ],
            'meses' => $this->porMes($de, $ate, $facturas, $notas, $pagamentos, $compras, $despesas),
            'gastosPorCategoria' => $this->gastosPorCategoria($totalCompras, $despesas),
            'clientes' => $this->porCliente($facturas, $notas, $pagamentos),
            'categorias' => $this->porCategoria($facturas),
            'facturas' => $facturas->take(100)->map(fn (Factura $f) => [
                'id' => $f->id,
                'numero' => $f->numero,
                'data' => $f->data->toDateString(),
                'cliente' => $f->terceiro->nome,
                'terceiro_id' => $f->terceiro_id,
                'total_sem_iva' => (string) $f->total_sem_iva,
                'total' => (string) $f->total,
                'pago' => (string) $f->total_pago,
                'em_falta' => $f->estado === Factura::VALIDADA ? $f->emFalta() : '0.00',
                'estado' => $f->estado,
                'vencida' => $f->estaVencida(),
            ])->values()->all(),
            'mais_facturas' => max(0, $facturas->count() - 100),
        ];
    }

    /** @return list<array<string, mixed>> Um ponto por mês do período (também os meses sem movimento) */
    private function porMes(CarbonImmutable $de, CarbonImmutable $ate, Collection $facturas, Collection $notas, Collection $pagamentos, Collection $compras, Collection $despesas): array
    {
        $meses = [];
        for ($m = $de->startOfMonth(); $m <= $ate; $m = $m->addMonth()) {
            $meses[$m->format('Y-m')] = ['mes' => $m->format('Y-m'), 'valor' => '0.00', 'n' => 0, 'recebido' => '0.00', 'compras' => '0.00', 'despesas' => '0.00'];
        }
        $somar = function (Collection $c, string $campoValor, string $destino, int $sinal = 1, bool $contar = false) use (&$meses) {
            foreach ($c as $x) {
                $chave = $x->data->format('Y-m');
                if (! isset($meses[$chave])) {
                    continue;
                }
                $valor = (string) $x->{$campoValor};
                $meses[$chave][$destino] = $sinal > 0 ? bcadd($meses[$chave][$destino], $valor, 2) : bcsub($meses[$chave][$destino], $valor, 2);
                if ($contar) {
                    $meses[$chave]['n']++;
                }
            }
        };
        $somar($facturas, 'total_sem_iva', 'valor', 1, true);
        $somar($notas, 'total_sem_iva', 'valor', -1);
        $somar($pagamentos, 'valor', 'recebido');
        $somar($compras, 'total_sem_iva', 'compras');
        $somar($despesas, 'valor', 'despesas');

        return array_values(array_map(function ($m) {
            $gastos = bcadd($m['compras'], $m['despesas'], 2);

            return [...$m, 'gastos' => $gastos, 'resultado' => bcsub($m['valor'], $gastos, 2)];
        }, $meses));
    }

    /** @return list<array{categoria: string, valor: string}> Para onde foi o dinheiro: compras de matéria-prima e cada categoria de despesa */
    private function gastosPorCategoria(string $compras, Collection $despesas): array
    {
        $linhas = $despesas->groupBy('categoria')->map(fn (Collection $ds, string $c) => [
            'categoria' => Despesa::CATEGORIAS[$c] ?? $c,
            'valor' => $ds->reduce(fn (string $t, Despesa $d) => bcadd($t, (string) $d->valor, 2), '0.00'),
        ])->values();
        if (bccomp($compras, '0', 2) > 0) {
            $linhas->push(['categoria' => 'Matéria-prima (compras)', 'valor' => $compras]);
        }

        return $linhas->sortByDesc(fn ($c) => (float) $c['valor'])->values()->all();
    }

    /** @return list<array<string, mixed>> Os 10 clientes com mais facturado no período */
    private function porCliente(Collection $facturas, Collection $notas, Collection $pagamentos): array
    {
        return $facturas->groupBy('terceiro_id')->map(function (Collection $fs, $terceiroId) use ($notas, $pagamentos) {
            $facturado = $fs->reduce(fn (string $t, Factura $f) => bcadd($t, (string) $f->total_sem_iva, 2), '0.00');
            $creditado = $notas->where('terceiro_id', $terceiroId)->reduce(fn (string $t, $n) => bcadd($t, (string) $n->total_sem_iva, 2), '0.00');

            return [
                'id' => (int) $terceiroId,
                'nome' => $fs->first()->terceiro->nome,
                'n' => $fs->count(),
                'facturado' => bcsub($facturado, $creditado, 2),
                'recebido' => $pagamentos->where('terceiro_id', $terceiroId)->reduce(fn (string $t, $p) => bcadd($t, (string) $p->valor, 2), '0.00'),
                'por_receber' => $fs->where('estado', Factura::VALIDADA)->reduce(fn (string $t, Factura $f) => bcadd($t, $f->emFalta(), 2), '0.00'),
            ];
        })->sortByDesc(fn ($c) => (float) $c['facturado'])->take(10)->values()->all();
    }

    /** @return list<array{categoria: string, valor: string}> Facturado (sem IVA) por categoria de produto */
    private function porCategoria(Collection $facturas): array
    {
        if ($facturas->isEmpty()) {
            return [];
        }

        return FacturaLinha::query()
            ->whereIn('factura_id', $facturas->pluck('id'))
            ->with('produto.categoria:id,nome')
            ->get(['id', 'factura_id', 'produto_id', 'total_sem_iva'])
            ->groupBy(fn (FacturaLinha $l) => $l->produto?->categoria?->nome ?? ($l->produto ? 'Sem categoria' : 'Linhas livres'))
            ->map(fn (Collection $ls, string $categoria) => [
                'categoria' => $categoria,
                'valor' => $ls->reduce(fn (string $t, FacturaLinha $l) => bcadd($t, (string) $l->total_sem_iva, 2), '0.00'),
            ])
            ->sortByDesc(fn ($c) => (float) $c['valor'])
            ->values()->all();
    }
}
