# LemGest — Plano de desenvolvimento

Sistema de gestão para a LemServ (Lounge e Outdoor): venda de serviços, aluguer de equipamento para eventos, entregas e montagens.

Regra de trabalho: um módulo só fica "feito" quando tem ecrãs (tema claro, escuro e telemóvel), permissões, auditoria e testes automáticos a verde.

> **Próximas alterações (prioridade):** aluguer por dia, stock, perfil Cliente com loja online e site público, WhatsApp e novo visual — ver **[ROADMAP-aluguer-e-loja.md](ROADMAP-aluguer-e-loja.md)**. As fases 3.1 (Stock), 3.2 (Aluguer e reservas) e parte da 5.2 (WhatsApp) passam a ser feitas por esse roadmap.

## Fase 1 — Núcleo

| # | Módulo | O que inclui | Estado |
|---|---|---|---|
| 1.1 | Utilizadores, perfis e permissões | Utilizadores, perfis (Administrador, Gestor, Comercial, Financeiro, Armazém, Equipa), matriz de permissões, activar/desactivar, auditoria | feito |
| 1.2 | Empresa e configurações | Empresa / Organização (NUIT, NUEL, forma jurídica, capital social, morada, contactos, logótipo carregado), textos dos documentos (rodapés, dados para pagamento, validade dos orçamentos), página de numeração, aviso no Início enquanto falta o NUIT — ver `docs/analise-dolibarr/05-configuracao.md` | feito (falta: dicionários editáveis — activar/desactivar taxas de IVA, termos e métodos de pagamento) |
| 1.3 | Terceiros | Clientes, potenciais e fornecedores; NUIT validado (9 dígitos), província, códigos CL/FO; separadores Contactos/Endereços e Cliente (orçamentos, encomendas, facturas) — ver `docs/analise-dolibarr/03-terceiros.md` | feito |
| 1.4 | Produtos e serviços | Catálogo com preço e IVA | feito (falta: equipamento de aluguer) |

## Fase 2 — Vendas e facturação

Estado: 2.1, 2.2 e 2.3 feitos (lista, ficha, rascunho → validação FT2026/0001, pagamentos parciais, abandonar, notas de crédito NC2026/0001 com abate na factura e reembolso, impressão A4), seguindo a análise de `docs/analise-dolibarr/01-facturacao-pagamento.md`, `04-comercio.md` e `06-notas-credito.md`.

| # | Módulo | O que inclui |
|---|---|---|
| 2.1 | Comércio: orçamentos e encomendas | Feito: área de comércio; orçamentos (rascunho → aberto OR2026/0001 → assinado / não assinado → facturado, validade, impressão); encomendas de venda (rascunho → validada EN2026/0001 → entregue / anulada, facturada); cadeia orçamento → encomenda → factura com objectos relacionados |
| 2.2 | Facturas | Numeração sequencial por série e ano, emissão bloqueia alterações, notas de crédito, PDF com logótipo |
| 2.3 | Pagamentos e recibos | Pagamento parcial ou total, recibo em PDF, estado da factura automático |
| 2.4 | Início (painel com dados reais) | Feito: vista global por módulo, informações de login, facturado por mês, não pagas, devedores, estatísticas — ver `docs/analise-dolibarr/02-inicio.md` |

## Fase 3 — Operação

| # | Módulo | O que inclui |
|---|---|---|
| 3.1 | Stock e inventário | Armazéns, entradas, saídas, transferências, stock mínimo |
| 3.2 | Aluguer e reservas | Calendário, disponibilidade por data, reserva → saída → devolução |
| 3.3 | Entregas e montagens | Agenda da equipa e viaturas, estado de cada transporte |
| 3.4 | Checklist com fotos | Confirmação peça a peça e fotos na saída e na devolução |
| 3.5 | Manutenção do equipamento | Lavagem e reparação; a peça fica indisponível até estar pronta |

## Fase 4 — Compras, finanças e equipa

| # | Módulo | O que inclui |
|---|---|---|
| 4.1 | Fornecedores e compras | Feito: módulo Compras (área, encomendas a fornecedor EF2026/0001 com encomendar/receber, facturas de fornecedor FF2026/0001 com nº do fornecedor único, pagamentos PF2026/0001), separador "Fornecedor" no terceiro, caixa no Início — ver `docs/analise-dolibarr/07-compras.md`. Falta: entrada em stock (depende de 3.1) |
| 4.2 | Despesas e fluxo de caixa | Despesas por categoria, mapa mensal de entradas e saídas |
| 4.3 | Funcionários e pagamentos | Equipa, presenças nas montagens, pagamento por evento ou diária |

## Fase 5 — Clientes e comunicação

| # | Módulo | O que inclui |
|---|---|---|
| 5.1 | CRM | Pedidos de orçamento, eventos em negociação, próximo contacto |
| 5.2 | WhatsApp, e-mail e lembretes | Enviar documentos, lembrete de facturas vencidas |

## Fase 6 — Relatórios e dados

| # | Módulo | O que inclui |
|---|---|---|
| 6.1 | Relatórios avançados | IVA mensal, lucro por serviço/equipamento, exportar Excel e PDF |
| 6.2 | Importar do Excel | Clientes, produtos e equipamento |

## Fase 7 — Monografia

Diagrama da base de dados, casos de uso, arquitectura, manual do utilizador, capturas de ecrã e relatório de testes.

## Fora do âmbito (por agora)

Kits e pacotes, caução e multas. (O portal do cliente passou para o roadmap da loja; o modo aplicação no telemóvel já existe.)
