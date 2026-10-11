<?php

namespace App\Services;

use App\Contracts\DocumentoComDias;
use App\Contracts\DocumentoComLinhas;
use App\Contracts\DocumentoDeCompra;
use App\Models\Produto;
use App\Support\Dinheiro;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Linhas de qualquer documento comercial (orçamento, encomenda, factura) e respectivos totais.
 *
 * Não verifica se o documento pode ser alterado: isso é regra de cada documento
 * e é verificado pelo serviço respectivo antes de chamar estes métodos.
 */
class LinhasDocumento
{
    /** @param array{produto_id?: ?int, descricao?: ?string, quantidade: string|float, preco_unitario?: string|float|null, desconto?: string|float|null, taxa_iva?: string|float|null} $dados */
    public function adicionar(Model&DocumentoComLinhas $documento, array $dados): Model
    {
        return DB::transaction(function () use ($documento, $dados) {
            $produto = isset($dados['produto_id']) ? Produto::find($dados['produto_id']) : null;
            $precoProduto = $documento instanceof DocumentoDeCompra ? $produto?->preco_compra : $produto?->precoDocumento();

            $linha = $documento->linhas()->make([
                'produto_id' => $produto?->id,
                'descricao' => trim((string) ($dados['descricao'] ?? '')) ?: trim(($produto?->referencia ? $produto->referencia.' - ' : '').$produto?->nome),
                'quantidade' => (string) $dados['quantidade'],
                'unidade' => $produto?->unidade,
                'preco_unitario' => (string) ($dados['preco_unitario'] ?? $precoProduto ?? '0'),
                'desconto' => (string) ($dados['desconto'] ?? '0'),
                'taxa_iva' => (string) ($dados['taxa_iva'] ?? $produto?->taxa_iva ?? '16'),
                'posicao' => (int) $documento->linhas()->max('posicao') + 1,
            ]);
            if ($documento instanceof DocumentoComDias) {
                $linha->dias = (int) ($dados['dias'] ?? $documento->diasPropostos($produto));
            }
            $this->calcular($linha);
            $linha->save();
            $this->recalcular($documento);

            return $linha;
        });
    }

    /** @param array<string, mixed> $dados */
    public function actualizar(Model&DocumentoComLinhas $documento, Model $linha, array $dados): Model
    {
        return DB::transaction(function () use ($documento, $linha, $dados) {
            $linha->fill([
                'descricao' => $dados['descricao'] ?? $linha->descricao,
                'quantidade' => (string) $dados['quantidade'],
                'preco_unitario' => (string) $dados['preco_unitario'],
                'desconto' => (string) ($dados['desconto'] ?? '0'),
                'taxa_iva' => (string) $dados['taxa_iva'],
            ]);
            if ($documento instanceof DocumentoComDias && isset($dados['dias'])) {
                $linha->dias = (int) $dados['dias'];
            }
            $this->calcular($linha);
            $linha->save();
            $this->recalcular($documento);

            return $linha;
        });
    }

    public function remover(Model&DocumentoComLinhas $documento, Model $linha): void
    {
        DB::transaction(function () use ($documento, $linha) {
            $linha->delete();
            $this->recalcular($documento);
        });
    }

    /** Copia todas as linhas de um documento para outro (orçamento → encomenda → factura). */
    public function copiar(DocumentoComLinhas $origem, Model&DocumentoComLinhas $destino): void
    {
        foreach ($origem->linhas()->get() as $l) {
            $campos = $l->only([
                'produto_id', 'descricao', 'quantidade', 'unidade', 'preco_unitario', 'desconto', 'taxa_iva',
                'total_sem_iva', 'total_iva', 'total', 'posicao',
            ]);
            // Os dias passam entre documentos de venda (orçamento → reserva → factura → nota de crédito)
            if ($destino instanceof DocumentoComDias && $l->getAttribute('dias') !== null) {
                $campos['dias'] = $l->dias;
            }
            $destino->linhas()->create($campos);
        }
        $this->recalcular($destino);
    }

    public function recalcular(Model&DocumentoComLinhas $documento): void
    {
        $linhas = $documento->linhas()->get(['total_sem_iva', 'total_iva', 'total']);
        $documento->total_sem_iva = Dinheiro::somar($linhas->pluck('total_sem_iva'));
        $documento->total_iva = Dinheiro::somar($linhas->pluck('total_iva'));
        $documento->total = Dinheiro::somar($linhas->pluck('total'));
        $documento->save();
    }

    /** Nas linhas com dias, a quantidade conta tantas vezes quantos os dias */
    public function calcular(Model $linha): void
    {
        $dias = $linha->getAttribute('dias');
        $linha->fill(Dinheiro::linha(
            $dias === null ? (string) $linha->quantidade : bcmul((string) $linha->quantidade, (string) $dias, 3),
            (string) $linha->preco_unitario,
            (string) $linha->desconto,
            (string) $linha->taxa_iva,
        ));
    }
}
