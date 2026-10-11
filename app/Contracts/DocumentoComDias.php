<?php

namespace App\Contracts;

use App\Models\Produto;

/**
 * Documento cujas linhas têm dias de aluguer: total = quantidade × dias × preço por dia − desconto.
 * (Reservas; na etapa 5 também orçamentos, encomendas e facturas.)
 */
interface DocumentoComDias
{
    /** Dias propostos a uma linha nova com este produto (1 para serviços e linhas livres) */
    public function diasPropostos(?Produto $produto): int;
}
