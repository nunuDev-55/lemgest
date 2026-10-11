<?php

namespace App\Contracts;

/**
 * Documento a fornecedor (encomenda, factura de fornecedor).
 * Ao escolher um produto, as linhas usam o preço de compra em vez do preço de venda.
 */
interface DocumentoDeCompra extends DocumentoComLinhas {}
