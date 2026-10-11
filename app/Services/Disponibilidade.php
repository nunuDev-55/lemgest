<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\ReservaLinha;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Quantas peças de cada produto estão livres num período.
 *
 * Livre num dia = peças que a LemServ tem − peças ocupadas nesse dia.
 * Livre no período = o pior dia do período (o material tem de estar livre em todos os dias).
 *
 * Ocupadas:
 * - peças alugadas que ainda não voltaram, até ao dia previsto de devolução, inclusive (voltam durante o dia,
 *   por isso esse dia não se promete a outro cliente). Sem data prevista, ou já atrasadas, contam em todo o período;
 * - reservas confirmadas que ainda não saíram, do dia da entrega ao dia da recolha, inclusive.
 * Os pedidos (por confirmar) não prendem material.
 */
class Disponibilidade
{
    /** Período máximo de uma consulta, em dias */
    public const MAXIMO_DIAS = 366;

    /**
     * @param  Collection<int, Produto>  $produtos
     * @param  int|null  $excluirReserva  reserva que não conta (a que se está a verificar)
     * @return array<int, array{total: int, ocupado: int, disponivel: int, dia_mais_cheio: ?string}>
     */
    public function noPeriodo(Collection $produtos, CarbonInterface $de, CarbonInterface $ate, ?int $excluirReserva = null): array
    {
        $hoje = CarbonImmutable::today();
        $inicio = CarbonImmutable::parse($de)->startOfDay()->max($hoje);
        $fim = CarbonImmutable::parse($ate)->startOfDay()->max($inicio);
        if ($inicio->diffInDays($fim) >= self::MAXIMO_DIAS) {
            $fim = $inicio->addDays(self::MAXIMO_DIAS - 1);
        }
        $dias = (int) $inicio->diffInDays($fim) + 1;
        $ids = $produtos->pluck('id');

        // Ocupação por produto e por dia (índice 0 = $inicio)
        $ocupacao = [];
        $ocupar = function (int $produto, int $primeiro, int $ultimo, int $quantidade) use (&$ocupacao, $dias) {
            for ($i = max(0, $primeiro); $i <= min($dias - 1, $ultimo); $i++) {
                $ocupacao[$produto][$i] = ($ocupacao[$produto][$i] ?? 0) + $quantidade;
            }
        };
        $indice = fn (CarbonInterface $dia) => (int) $inicio->diffInDays($dia, false);

        $saidas = MovimentoStock::query()
            ->where('tipo', MovimentoStock::SAIDA)
            ->where('pendente', '>', 0)
            ->whereIn('produto_id', $ids)
            ->get(['produto_id', 'pendente', 'devolucao_prevista']);
        foreach ($saidas as $s) {
            $prevista = $s->devolucao_prevista ? CarbonImmutable::parse($s->devolucao_prevista) : null;
            $ultimo = $prevista === null || $prevista->lt($hoje) ? $dias - 1 : $indice($prevista);
            $ocupar($s->produto_id, 0, $ultimo, $s->pendente);
        }

        $reservadas = ReservaLinha::query()
            ->whereIn('produto_id', $ids)
            ->whereHas('reserva', fn ($q) => $q->quePrendem()
                ->whereDate('data_recolha', '>=', $inicio->toDateString())
                ->whereDate('data_entrega', '<=', $fim->toDateString())
                ->when($excluirReserva, fn ($q, $id) => $q->whereKeyNot($id)))
            ->with('reserva:id,data_entrega,data_recolha')
            ->get(['id', 'reserva_id', 'produto_id', 'quantidade']);
        foreach ($reservadas as $l) {
            $ocupar($l->produto_id, $indice($l->reserva->data_entrega), $indice($l->reserva->data_recolha), $l->pecas());
        }

        $resultado = [];
        foreach ($produtos as $p) {
            $dia = null;
            $maximo = 0;
            foreach ($ocupacao[$p->id] ?? [] as $i => $n) {
                if ($n > $maximo) {
                    [$maximo, $dia] = [$n, $inicio->addDays($i)->toDateString()];
                }
            }
            $resultado[$p->id] = [
                'total' => $p->quantidade_total,
                'ocupado' => $maximo,
                'disponivel' => max(0, $p->quantidade_total - $maximo),
                'dia_mais_cheio' => $dia,
            ];
        }

        return $resultado;
    }

    /** Peças em reservas confirmadas que ainda não saíram (de hoje em diante), por produto */
    public function reservadas(Collection $ids): array
    {
        return ReservaLinha::query()
            ->whereIn('produto_id', $ids)
            ->whereHas('reserva', fn ($q) => $q->quePrendem()->whereDate('data_recolha', '>=', today()->toDateString()))
            ->get(['produto_id', 'quantidade'])
            ->groupBy('produto_id')
            ->map(fn ($linhas) => (int) $linhas->sum(fn (ReservaLinha $l) => $l->pecas()))
            ->all();
    }
}
