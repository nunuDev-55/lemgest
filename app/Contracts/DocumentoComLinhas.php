<?php

namespace App\Contracts;

use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Documento comercial com linhas e totais (orçamento, encomenda, factura).
 * As linhas e os totais são calculados sempre da mesma forma (App\Services\LinhasDocumento).
 *
 * @property string|null $total_sem_iva
 * @property string|null $total_iva
 * @property string|null $total
 */
interface DocumentoComLinhas
{
    public function linhas(): HasMany;

    public function eRascunho(): bool;

    public function referencia(): string;
}
