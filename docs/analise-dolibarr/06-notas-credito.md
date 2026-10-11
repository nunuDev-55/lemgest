# Análise funcional — Dolibarr 24: Notas de crédito

Estudo feito a partir da utilização do Dolibarr 24.0.2. O LemGest reproduz as funcionalidades com código próprio.

## 1. O que é

Uma factura validada não se altera nem se apaga (a numeração não pode ter falhas). Para a corrigir emite-se uma **nota de crédito**: um documento com número próprio que anula a factura no todo ou em parte. Isto é preciso, por exemplo, quando o cliente devolve material, quando um serviço é cancelado ou quando há um erro de preço.

## 2. Como se cria no Dolibarr

- Na ficha de uma factura validada, o botão **Criar nota de crédito** abre o formulário de nova factura com o tipo "Nota de crédito" e a factura de origem já escolhida.
- Opção para **copiar as linhas da factura de origem** ou para indicar só um valor.
- A nota nasce em rascunho (`(PROVn)`); as linhas podem ser ajustadas; ao validar recebe o número da série das notas de crédito.

## 3. O que acontece depois de validada

| Situação da factura | O que o Dolibarr permite |
|---|---|
| Ainda por pagar | **Converter em desconto futuro** e usá-lo na factura: o "restante a pagar" diminui; se chegar a zero, a factura fica paga |
| Já paga | **Reembolsar**: regista-se o dinheiro devolvido ao cliente; a nota fica fechada |

A ficha da factura passa a mostrar a nota nos *Objectos relacionados* e na tabela de pagamentos ("Notas de crédito").

## 4. Regras

- Só se emite nota de crédito para facturas validadas (não para rascunhos nem abandonadas).
- O total das notas de crédito não pode passar do total da factura.
- A nota de crédito validada não volta a rascunho e não se apaga.

## Adaptações do LemGest

- As notas de crédito têm tabela própria (`notas_credito`), com número `NC2026/0001`, e ficam sempre ligadas à factura que corrigem.
- O motivo é obrigatório e aparece no documento impresso, junto com o número e a data da factura corrigida.
- **Conversão automática**: ao validar, o valor abate primeiro no que falta pagar da factura. O que sobra, se a factura já estava paga (no todo ou em parte), fica **por reembolsar** ao cliente. O Dolibarr faz isto em dois passos (converter em desconto e depois usar o desconto); como cada nota corrige uma única factura, o LemGest junta-os num só.
- Na factura, o "restante a receber" passa a ser *total − pagamentos − notas de crédito*. Se chegar a zero, a factura fica paga.
- Uma factura com notas de crédito já não pode ser classificada como abandonada.
- Só há um rascunho de nota de crédito de cada vez por factura.
- O valor facturado no Início e na ficha do cliente desconta as notas de crédito validadas, no mês em que foram emitidas.
- Permissões: as mesmas das facturas (criar rascunho, validar) e de pagamentos (registar reembolso).
