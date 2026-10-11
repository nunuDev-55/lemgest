# Análise funcional — Dolibarr 24: Facturação | Pagamento

Estudo do módulo de facturação do Dolibarr 24.0.2 (instalado em `C:\xampp\htdocs\dolibarr`), feito a partir da utilização do sistema.
O LemGest reproduz as **funcionalidades e a organização** destes ecrãs com código próprio; nenhum código do Dolibarr (licença GPL) é copiado.

## 1. Menu do módulo

| Entrada | Função |
|---|---|
| Facturas a clientes → Nova factura | Cria uma factura em rascunho |
| Lista | Todas as facturas, com atalhos por estado: Rascunho, Pendente de cobrança, Paga, Abandonada |
| Pagamentos | Lista dos pagamentos recebidos |
| Lista de modelos, Encomendas por facturar, Salários | Fora do âmbito da primeira versão |

## 2. Área do módulo (página inicial)

- Facturas em rascunho (lista curta)
- Últimas facturas modificadas: referência, cliente, montante com IVA, data

## 3. Lista de facturas

Colunas: Ref., Data da factura, Data de vencimento, Terceiro, Valor (sem IVA), Montante (com IVA), Nº requisição, Estado.
Por cima de cada coluna há um campo de filtro; no fim, linha de totais; escolha de registos por página.

## 4. Nova factura (cabeçalho)

Cliente · Tipo (normal, adiantamento, substituição, nota de crédito) · Data · Termos de pagamento (pronto pagamento, 30, 45, 60 dias…) · Método de pagamento · Conta bancária · Origem · Nº requisição · Nota pública · Nota interna.

## 5. Ficha da factura

- Separadores: Factura · Contactos · Notas · Documentos · Eventos
- Cabeçalho: referência, estado, cliente (com ligação "outras facturas")
- Campos: tipo, data, termos de pagamento, vencimento, método de pagamento, nº requisição
- Totais: valor sem IVA, IVA, total com IVA
- Pagamentos: lista, "já pago", "facturado", "restante a receber"
- Linhas: descrição, IVA, P.U. sem IVA, P.U. com IVA, quantidade, desconto, total sem IVA
- Botões conforme o estado:

| Estado | Botões |
|---|---|
| Rascunho (`PROV`) | Validar · Modificar · Eliminar |
| Pendente de cobrança | Inserir pagamento · Classificar como abandonada · Criar nota de crédito · Enviar · Clonar |
| Paga | Criar nota de crédito · Clonar |

## 6. Regras de negócio observadas

1. A factura nasce em **rascunho** com referência provisória; só ao **validar** recebe o número definitivo e sequencial (no Dolibarr `IN2610-0001`).
2. Depois de validada, as linhas e os valores **deixam de poder ser alterados**; corrige-se com nota de crédito.
3. O vencimento é calculado a partir da data e dos termos de pagamento.
4. Um pagamento pode ser parcial; quando o total é recebido, a factura passa sozinha a **Paga**.
5. "Abandonar" fecha uma factura que não vai ser cobrada, com motivo.
6. Só os rascunhos podem ser apagados.

## 7. Registar pagamento

Empresa · Data · Método · Conta · Nº (cheque/transferência) · Remetente · Banco · Comentários · tabela com as facturas em aberto do cliente e o montante a pagar em cada uma.

## 8. Lista de pagamentos

Ref. pagamento · Data · Terceiro · Tipo · Número · Conta · Montante.

## Adaptações do LemGest a Moçambique

- Numeração `FT 2026/0001` por ano; pagamentos `PG 2026/0001`.
- IVA 16 %, 5 % e 0 %; NUIT do cliente; M-Pesa, e-Mola, mKesh, numerário, transferência, cartão (POS) e cheque.
- Valores em meticais: `1 740,00 MT`.
