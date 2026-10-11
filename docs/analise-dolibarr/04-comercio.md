# Análise funcional — Dolibarr 24: Comércio (orçamentos e encomendas)

Estudo feito a partir da utilização do Dolibarr 24.0.2. O LemGest reproduz as funcionalidades com código próprio.

## 1. Menu do módulo

| Secção | Entradas |
|---|---|
| Orçamentos | Novo orçamento · Lista · Rascunhos · Aberto · Assinado (por facturar) · Sem assinar (fechado) · Facturado |
| Encomendas de venda | Nova encomenda · Lista · Rascunho · Validada · Entregue · Anulada |

## 2. Área de comércio

Orçamentos em rascunho · Encomendas em rascunho · Últimos orçamentos modificados · Últimas encomendas modificadas · **Orçamentos abertos** · **Encomendas por processar** · estatísticas.

## 3. Orçamento

Cabeçalho: Cliente · Data · **Duração da validade (dias)** · Termos de pagamento · Método de pagamento · Origem · Prazo de entrega · Data de entrega · Notas pública e interna.
Linhas: as mesmas da factura (descrição, IVA, P.U., quantidade, desconto).

| Estado | Botões |
|---|---|
| Rascunho | Validar · Modificar · Eliminar |
| Aberto (validado, com número) | Fechar como **assinado** ou **não assinado** · Modificar (volta a rascunho) · Enviar |
| Assinado (por facturar) | **Criar encomenda** · **Criar factura** · Classificar como facturado · Reabrir |
| Sem assinar (fechado) | Reabrir |
| Facturado | — |

O orçamento aberto cuja validade passou é assinalado como atrasado.

## 4. Encomenda de venda

Cabeçalho: Cliente · Data · **Data prevista de entrega** · Termos e método de pagamento · Origem · Notas.

| Estado | Botões |
|---|---|
| Rascunho | Validar · Modificar · Eliminar |
| Validada | **Classificar como entregue** · **Criar factura** · Anular · Modificar (volta a rascunho) |
| Entregue | **Criar factura** · Classificar como facturada · Reabrir |
| Anulada | Reabrir |

A encomenda tem ainda a marca **facturada** (independente do estado de entrega).

## 5. Objectos relacionados

Cada documento mostra os documentos ligados: orçamento → encomenda → factura.

## Adaptações do LemGest

- Numeração: `OR2026/0001` (orçamentos), `EN2026/0001` (encomendas), atribuída ao validar.
- Criar encomenda ou factura copia o cliente, os termos e todas as linhas; o orçamento passa a "Facturado" quando é facturado (directamente ou pela encomenda).
- Sem módulo de expedições (fora do âmbito): "entregue" marca-se directamente na encomenda.
