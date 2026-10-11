# Análise funcional — Dolibarr 24: Compras a fornecedores

Estudo feito a partir da utilização do Dolibarr 24.0.2. O LemGest reproduz as funcionalidades com código próprio.

## 1. Onde fica no Dolibarr

- **Comércio → Encomendas a fornecedores**: nova encomenda, lista e filtros por estado.
- **Facturação | Pagamento → Facturas de fornecedores**: nova factura, lista, pagamentos a fornecedores.
- **Ficha do terceiro → separador "Fornecedor"**: resumo do que se comprou e últimas encomendas e facturas, com botões para criar novas.

## 2. Encomenda a fornecedor

Cabeçalho: Fornecedor · Data · Data prevista de entrega · Termos e método de pagamento · Referência do fornecedor · Notas.
Linhas: produto ou texto livre, com **preço de compra** (o do produto para esse fornecedor), IVA, quantidade e desconto.

| Estado | Botões |
|---|---|
| Rascunho | Validar · Modificar · Eliminar |
| Validada | **Encomendar** (data e método: e-mail, telefone...) · Modificar (volta a rascunho) · Anular |
| Encomendada | **Receber** (no todo ou em parte) · Criar factura · Anular |
| Recebida | Criar factura · Classificar como facturada · Reabrir |
| Anulada | Reabrir |

O Dolibarr tem ainda o passo opcional "Aprovar" (para empresas com aprovação em dois níveis) e a recepção por armazém ligada ao módulo de stock.

## 3. Factura de fornecedor

- Campo obrigatório **Ref. fornecedor**: o número que vem na factura do fornecedor. O Dolibarr não deixa lançar duas vezes a mesma ref. do mesmo fornecedor.
- Ao validar recebe uma referência interna da série das facturas de fornecedor.
- Vencimento calculado pelos termos de pagamento.
- Pagamentos parciais ou totais; paga a totalidade, fica "Paga". Sem pagamentos pode ser abandonada.

## Adaptações do LemGest

- As compras ficam num **módulo próprio, "Compras"**, com área de resumo: o que está por receber e o que está por pagar, por data de vencimento. No Dolibarr estão repartidas entre Comércio e Facturação.
- Numeração: `EF2026/0001` (encomendas), `FF2026/0001` (número interno das facturas de fornecedor), `PF2026/0001` (pagamentos a fornecedores).
- O preço sugerido nas linhas é o **preço de compra** do produto (campo da ficha do produto). Não há tabela de preços por fornecedor nesta versão.
- "Encomendar" regista a data e o meio: e-mail, WhatsApp, telefone ou presencial. A encomenda impressa leva a nota "indique o nosso número de encomenda na factura".
- A recepção é total ("Classificar como recebida"). A recepção parcial e a entrada em stock ficam para o módulo de Stock (plano 3.1).
- Sem o passo de aprovação: a validação já é feita por quem tem a permissão `compras.validar`.
- Permissões próprias: `compras.ver`, `compras.criar`, `compras.validar`, `compras.receber` (armazém) e `compras.pagar` (financeiro).
- O Início ganhou a caixa **Compras**: encomendas por receber (com as atrasadas) e facturas de fornecedor por pagar (com as vencidas).
