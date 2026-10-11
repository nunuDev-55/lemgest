<?php

namespace App\Services;

use App\Models\EncomendaFornecedor;
use App\Models\Inventario;
use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Movimentos de stock. É o único sítio onde as quantidades dos produtos mudam.
 *
 * Regras:
 * - só os produtos (não os serviços) têm stock;
 * - nada fica negativo e nunca há mais peças fora do que as que a LemServ tem;
 * - cada mudança é um movimento com data, quantidade, motivo e quem o fez; os movimentos não se apagam;
 * - uma devolução (ou perda de peças que estavam fora) refere sempre a saída de onde as peças vieram.
 */
class Stock
{
    /** Quantidade que um produto já tinha quando passou a ser controlado (ou ao ser criado) */
    public function inicial(Produto $produto, int $quantidade, User $quem): ?MovimentoStock
    {
        if ($quantidade <= 0) {
            return null;
        }

        return $this->aplicar($produto, MovimentoStock::INICIAL, $quantidade, $quantidade, 0, [
            'data' => today()->toDateString(),
            'motivo' => 'Quantidade inicial',
        ], $quem, null, "Quantidade inicial: {$quantidade} × {$produto->referencia}");
    }

    /** @param array{data?: string, motivo?: ?string} $dados */
    public function entrada(Produto $produto, int $quantidade, array $dados, User $quem, ?Model $origem = null): MovimentoStock
    {
        $this->garantirPositiva($quantidade);

        return $this->aplicar($produto, MovimentoStock::ENTRADA, $quantidade, $quantidade, 0, $this->base($dados), $quem, $origem,
            "Entrada: {$quantidade} × {$produto->referencia}".$this->sufixo($dados));
    }

    /** @param array{data?: string, devolucao_prevista?: ?string, terceiro_id?: ?int, motivo?: ?string} $dados */
    public function saida(Produto $produto, int $quantidade, array $dados, User $quem, ?Model $origem = null): MovimentoStock
    {
        $this->garantirPositiva($quantidade);
        $base = $this->base($dados);
        if (! empty($dados['devolucao_prevista']) && $dados['devolucao_prevista'] < $base['data']) {
            $this->falhar('A devolução prevista não pode ser antes da data de saída.');
        }

        return $this->aplicar($produto, MovimentoStock::SAIDA, $quantidade, 0, $quantidade, [
            ...$base,
            'devolucao_prevista' => $dados['devolucao_prevista'] ?? null,
            'terceiro_id' => $dados['terceiro_id'] ?? null,
            'pendente' => $quantidade,
        ], $quem, $origem, "Saída para aluguer: {$quantidade} × {$produto->referencia}".$this->sufixo($dados));
    }

    /** Peças que voltam de uma saída. @param array{data?: string, motivo?: ?string} $dados */
    public function devolucao(MovimentoStock $saida, int $quantidade, array $dados, User $quem): MovimentoStock
    {
        $this->garantirPositiva($quantidade);

        return DB::transaction(function () use ($saida, $quantidade, $dados, $quem) {
            $saida = $this->saidaAberta($saida, $quantidade);
            $base = $this->base($dados);
            if ($base['data'] < $saida->data->toDateString()) {
                $this->falhar('A devolução não pode ser antes da saída ('.$saida->data->format('d/m/Y').').');
            }
            $saida->decrement('pendente', $quantidade);

            return $this->aplicar($saida->produto, MovimentoStock::DEVOLUCAO, $quantidade, 0, -$quantidade, [
                ...$base,
                'saida_id' => $saida->id,
                'terceiro_id' => $saida->terceiro_id,
            ], $quem, $saida->origem, "Devolução: {$quantidade} × {$saida->produto->referencia}".$this->sufixo($dados));
        });
    }

    /**
     * Perda ou dano sem reparação: as peças deixam de contar.
     * Com $saida, são peças que estavam alugadas e não voltaram; sem ela, peças do armazém.
     *
     * @param  array{data?: string, motivo?: ?string}  $dados
     */
    public function abate(Produto $produto, int $quantidade, array $dados, User $quem, ?MovimentoStock $saida = null): MovimentoStock
    {
        $this->garantirPositiva($quantidade);
        if (blank($dados['motivo'] ?? null)) {
            $this->falhar('Indique o motivo (ex.: partida na montagem, não devolvida pelo cliente).');
        }

        return DB::transaction(function () use ($produto, $quantidade, $dados, $quem, $saida) {
            $extra = $this->base($dados);
            $deltaFora = 0;
            if ($saida !== null) {
                $saida = $this->saidaAberta($saida, $quantidade);
                if ($saida->produto_id !== $produto->id) {
                    $this->falhar('A saída indicada é de outro produto.');
                }
                $saida->decrement('pendente', $quantidade);
                $extra += ['saida_id' => $saida->id, 'terceiro_id' => $saida->terceiro_id];
                $deltaFora = -$quantidade;
            }

            return $this->aplicar($produto, MovimentoStock::ABATE, $quantidade, -$quantidade, $deltaFora, $extra, $quem, $saida?->origem,
                "Perda ou dano: {$quantidade} × {$produto->referencia}".$this->sufixo($dados));
        });
    }

    /** Corrige a quantidade total para a contada. Devolve null se já estava certa. @param array{data?: string, motivo?: ?string} $dados */
    public function ajustar(Produto $produto, int $novoTotal, array $dados, User $quem, ?Model $origem = null): ?MovimentoStock
    {
        if ($novoTotal < 0) {
            $this->falhar('A quantidade contada não pode ser negativa.');
        }

        return DB::transaction(function () use ($produto, $novoTotal, $dados, $quem, $origem) {
            $actual = Produto::whereKey($produto->id)->lockForUpdate()->firstOrFail();
            $delta = $novoTotal - $actual->quantidade_total;
            if ($delta === 0) {
                return null;
            }

            return $this->aplicar($actual, MovimentoStock::AJUSTE, abs($delta), $delta, 0, $this->base($dados), $quem, $origem,
                "Ajuste de inventário de {$actual->referencia}: {$actual->quantidade_total} → {$novoTotal}".$this->sufixo($dados), registar: $origem === null);
        });
    }

    /** Contagem de um produto: as peças no armazém mais as alugadas passam a ser o total. */
    public function contagem(Produto $produto, int $noArmazem, array $dados, User $quem): ?MovimentoStock
    {
        if ($noArmazem < 0) {
            $this->falhar('A quantidade contada não pode ser negativa.');
        }

        return DB::transaction(function () use ($produto, $noArmazem, $dados, $quem) {
            $actual = Produto::whereKey($produto->id)->lockForUpdate()->firstOrFail();

            return $this->ajustar($actual, $noArmazem + $actual->quantidade_fora, $dados, $quem);
        });
    }

    /**
     * Inventário: grava a contagem e ajusta cada produto com diferença.
     * Conta-se o que está no armazém; as peças alugadas somam-se ao total automaticamente.
     *
     * @param  array<int, int>  $contagens  produto_id => peças contadas no armazém (só os produtos contados)
     */
    public function inventario(array $contagens, ?string $nota, User $quem): Inventario
    {
        if ($contagens === []) {
            $this->falhar('Conte pelo menos um produto.');
        }

        return DB::transaction(function () use ($contagens, $nota, $quem) {
            $inventario = new Inventario(['data' => today(), 'nota' => $nota]);
            $inventario->criado_por = $quem->id;
            $inventario->save();

            $diferencas = 0;
            $produtos = Produto::whereIn('id', array_keys($contagens))->where('tipo', 'produto')->orderBy('referencia')->lockForUpdate()->get();
            foreach ($produtos as $p) {
                $contado = (int) $contagens[$p->id] + $p->quantidade_fora;
                $inventario->linhas()->create([
                    'produto_id' => $p->id,
                    'referencia' => $p->referencia,
                    'nome' => $p->nome,
                    'esperado' => $p->quantidade_total,
                    'contado' => $contado,
                    'diferenca' => $contado - $p->quantidade_total,
                ]);
                if ($this->ajustar($p, $contado, ['motivo' => 'Inventário'], $quem, $inventario) !== null) {
                    $diferencas++;
                }
            }

            $inventario->update(['produtos_contados' => $produtos->count(), 'diferencas' => $diferencas]);

            activity('stock')->performedOn($inventario)->causedBy($quem)->event('created')
                ->log("Inventário de {$inventario->data->format('d/m/Y')}: {$produtos->count()} produto(s) contado(s), {$diferencas} com diferença");

            return $inventario;
        });
    }

    /** Recepção de uma encomenda a fornecedor: as linhas com produtos (em peças inteiras) dão entrada em stock. Devolve o nº de peças. */
    public function receberEncomenda(EncomendaFornecedor $encomenda, User $quem): int
    {
        $pecas = 0;
        foreach ($encomenda->linhas()->with('produto')->get() as $linha) {
            $quantidade = (string) $linha->quantidade;
            if ($linha->produto?->tipo !== 'produto' || bccomp($quantidade, '0', 3) <= 0 || bccomp($quantidade, (string) (int) $quantidade, 3) !== 0) {
                continue; // linhas livres, serviços e quantidades com casas decimais (metros, quilos) não entram em stock
            }
            $this->entrada($linha->produto, (int) $quantidade, ['motivo' => "Recepção da encomenda {$encomenda->referencia()}"], $quem, $encomenda);
            $pecas += (int) $quantidade;
        }

        return $pecas;
    }

    /** Ao reabrir uma encomenda recebida, as entradas dela são anuladas (se as peças ainda estiverem no armazém) */
    public function anularRecepcao(EncomendaFornecedor $encomenda, User $quem): void
    {
        $entradas = MovimentoStock::where('origem_type', $encomenda->getMorphClass())->where('origem_id', $encomenda->id)
            ->whereIn('tipo', [MovimentoStock::ENTRADA, MovimentoStock::ANULACAO])->with('produto')->get();

        // Por produto: o que entrou menos o que já foi anulado
        foreach ($entradas->groupBy('produto_id') as $movimentos) {
            $liquido = $movimentos->sum('delta_total');
            if ($liquido <= 0) {
                continue;
            }
            $produto = $movimentos->first()->produto;
            $this->aplicar($produto, MovimentoStock::ANULACAO, $liquido, -$liquido, 0, [
                'data' => today()->toDateString(),
                'motivo' => "Encomenda {$encomenda->referencia()} reaberta",
            ], $quem, $encomenda, "Entrada anulada: {$liquido} × {$produto->referencia} (encomenda {$encomenda->referencia()} reaberta)");
        }
    }

    /* ------------------------------------------------------------ */

    /**
     * Aplica um movimento: bloqueia o produto, verifica as regras, actualiza os totais e grava o movimento.
     *
     * @param  array<string, mixed>  $extra
     */
    private function aplicar(Produto $produto, string $tipo, int $quantidade, int $deltaTotal, int $deltaFora, array $extra, ?User $quem, ?Model $origem, string $descricao, bool $registar = true): MovimentoStock
    {
        return DB::transaction(function () use ($produto, $tipo, $quantidade, $deltaTotal, $deltaFora, $extra, $quem, $origem, $descricao, $registar) {
            $p = Produto::whereKey($produto->id)->lockForUpdate()->firstOrFail();
            if ($p->tipo !== 'produto') {
                $this->falhar("{$p->referencia} é um serviço e não tem stock.");
            }

            $total = $p->quantidade_total + $deltaTotal;
            $fora = $p->quantidade_fora + $deltaFora;
            $noArmazem = $p->quantidade_total - $p->quantidade_fora;

            if ($total < 0 || $fora < 0 || $fora > $total) {
                $this->falhar(match ($tipo) {
                    MovimentoStock::SAIDA => "Só há {$noArmazem} peça(s) de {$p->referencia} no armazém ({$p->quantidade_fora} de {$p->quantidade_total} estão alugadas).",
                    MovimentoStock::ABATE, MovimentoStock::ANULACAO => "Só há {$noArmazem} peça(s) de {$p->referencia} no armazém; não se podem retirar {$quantidade}.",
                    MovimentoStock::AJUSTE => "{$p->referencia} tem {$p->quantidade_fora} peça(s) alugada(s); o total não pode ficar abaixo disso.",
                    default => "A quantidade de {$p->referencia} ficaria negativa.",
                });
            }

            Produto::whereKey($p->id)->update(['quantidade_total' => $total, 'quantidade_fora' => $fora]);

            $movimento = new MovimentoStock([
                'produto_id' => $p->id,
                'tipo' => $tipo,
                'quantidade' => $quantidade,
                'delta_total' => $deltaTotal,
                'delta_fora' => $deltaFora,
                'total_depois' => $total,
                'fora_depois' => $fora,
                ...$extra,
            ]);
            $movimento->origem()->associate($origem);
            $movimento->criado_por = $quem?->id;
            $movimento->save();

            if ($registar) {
                activity('stock')->performedOn($p)->causedBy($quem)->event('updated')->log($descricao);
            }

            $p->forceFill(['quantidade_total' => $total, 'quantidade_fora' => $fora])->syncOriginal();

            return $movimento->setRelation('produto', $p);
        });
    }

    /** Bloqueia a saída e confirma que ainda tem as peças pedidas por voltar */
    private function saidaAberta(MovimentoStock $saida, int $quantidade): MovimentoStock
    {
        $saida = MovimentoStock::whereKey($saida->id)->lockForUpdate()->with('produto')->firstOrFail();
        if ($saida->tipo !== MovimentoStock::SAIDA) {
            $this->falhar('O movimento indicado não é uma saída para aluguer.');
        }
        if ($quantidade > $saida->pendente) {
            $this->falhar($saida->pendente === 0
                ? 'Todas as peças desta saída já voltaram.'
                : "Desta saída só faltam voltar {$saida->pendente} peça(s).");
        }

        return $saida;
    }

    /** @param array<string, mixed> $dados @return array{data: string, motivo: ?string} */
    private function base(array $dados): array
    {
        $data = isset($dados['data']) ? Carbon::parse($dados['data'])->toDateString() : today()->toDateString();
        if ($data > today()->toDateString()) {
            $this->falhar('A data do movimento não pode ser no futuro.');
        }

        return ['data' => $data, 'motivo' => filled($dados['motivo'] ?? null) ? trim($dados['motivo']) : null];
    }

    /** @param array<string, mixed> $dados */
    private function sufixo(array $dados): string
    {
        return filled($dados['motivo'] ?? null) ? ' — '.trim($dados['motivo']) : '';
    }

    private function garantirPositiva(int $quantidade): void
    {
        if ($quantidade < 1) {
            $this->falhar('A quantidade tem de ser pelo menos 1.');
        }
    }

    private function falhar(string $mensagem): never
    {
        throw ValidationException::withMessages(['stock' => $mensagem]);
    }
}
