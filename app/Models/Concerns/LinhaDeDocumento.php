<?php

namespace App\Models\Concerns;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Campos comuns às linhas de orçamentos, encomendas e facturas. */
trait LinhaDeDocumento
{
    public function initializeLinhaDeDocumento(): void
    {
        $this->mergeFillable([
            'produto_id', 'descricao', 'quantidade', 'unidade', 'dias', 'preco_unitario', 'desconto', 'taxa_iva',
            'total_sem_iva', 'total_iva', 'total', 'posicao',
        ]);
        $this->mergeCasts([
            'quantidade' => 'decimal:3',
            'dias' => 'integer', // só nas linhas de venda (as de compra não têm dias)
            'preco_unitario' => 'decimal:2',
            'desconto' => 'decimal:2',
            'taxa_iva' => 'decimal:2',
            'total_sem_iva' => 'decimal:2',
            'total_iva' => 'decimal:2',
            'total' => 'decimal:2',
        ]);
    }

    /** @return BelongsTo<Produto, $this> */
    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    /** Dados para o ecrã (iguais em todos os documentos) */
    public function paraEcra(): array
    {
        return [
            'id' => $this->id,
            'produto_id' => $this->produto_id,
            'descricao' => $this->descricao,
            'quantidade' => $this->quantidade,
            'unidade' => $this->unidade,
            'dias' => $this->dias,
            'preco_unitario' => $this->preco_unitario,
            'desconto' => $this->desconto,
            'taxa_iva' => $this->taxa_iva,
            'total_sem_iva' => $this->total_sem_iva,
            'total' => $this->total,
        ];
    }
}
