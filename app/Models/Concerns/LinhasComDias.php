<?php

namespace App\Models\Concerns;

use App\Models\Produto;

/**
 * Documentos de venda cujas linhas têm dias (contrato DocumentoComDias).
 * Sem um período no cabeçalho, cada linha nova começa com 1 dia e muda-se à mão.
 */
trait LinhasComDias
{
    public function diasPropostos(?Produto $produto): int
    {
        return 1;
    }
}
