# LemGest — Roadmap: aluguer, stock, loja online e novo visual

A LemServ vive do **aluguer de material para eventos**. Este roadmap adapta o LemGest a isso e abre-o aos clientes:

- facturação **por dia de aluguer**;
- **stock** que desce quando o material sai e volta quando é devolvido;
- **perfil Cliente**, com registo, **loja de aluguer** (carrinho e reserva) e **site público** com os produtos e serviços;
- **confirmação por WhatsApp** à dona, com recibo e uma lista sem preços para o grupo;
- **novo visual**, deixando o aspecto Dolibarr.

Regra de trabalho (mantém-se): cada etapa só fica "feita" com ecrãs, regras, permissões, auditoria, dados de demonstração e testes automáticos a verde. Os pontos marcados com ❓ são decisões tuas, a tomar antes de começar essa etapa.

---

## Ordem de execução

| # | Etapa | Depende de | Tamanho |
|---|---|---|---|
| 0 | Decisões e protótipos do novo visual | — | P · visual aprovado; D2–D6 decididas (D7–D10 por responder) |
| 1 | Novo visual — base (cores, menus, componentes) | 0 | M · **feito** |
| 2 | Produtos de aluguer (preço por dia, quantidade, fotos, publicar na loja) | 1 | M · **feito** |
| 3 | Stock (movimentos e disponibilidade por data) | 2 | G · **feito** |
| 4 | Aluguer: reservas → saída → devolução | 3 | G · **feito** |
| 5 | Facturação por dia (orçamentos, reservas, facturas) | 4 | M · **feito** |
| 6 | Perfil Cliente: registo, login e área do cliente | 1 | M · **feito** |
| 7 | Site público (montra de produtos e serviços) | 2, 6 | M |
| 8 | Loja: catálogo, carrinho e reserva | 4, 5, 6 | G |
| 9 | Local do evento com as ruas de Moçambique (mapa) | 8 | M |
| 10 | WhatsApp: confirmação à dona e lista sem preços | 8 | M |
| 11 | Publicação online (para clientes fora do Wi-Fi) | 10 | M |

P = pequena · M = média · G = grande. As etapas 1 a 5 são o "motor" do aluguer, e a loja (6 a 10) assenta nelas. O visual vem primeiro para os ecrãs novos já nascerem com o aspecto final, em vez de serem feitos duas vezes.

---

## Etapa 0 — Decisões e protótipos

**O que é:** mostrar-te 2 ou 3 propostas de visual (painel, lista, ficha, loja no telemóvel) com as cores da LemServ, para escolheres. Ao mesmo tempo fechamos as regras de negócio abaixo.

**❓ Decisões**
- **D1 — Visual:** que proposta segues (ex.: "moderno claro", "escuro elegante", "marca forte roxo/laranja").
- **D2 — Preço por dia:** ✅ todos os dias ao mesmo preço; descontos à mão por linha.
- **D3 — Contagem de dias:** ✅ (provisória) o dia de entrega e o de recolha contam como ocupados; os dias a cobrar são os do evento, ajustáveis.
- **D4 — Reserva e stock:** ✅ o pedido não prende; só a confirmação prende o stock.
- **D5 — Transporte:** ✅ linha de serviço (Transporte) na reserva, com o preço escrito.
- **D6 — Temas de cores:** ✅ texto livre na reserva.
- **D7 — Registo de clientes:** ✅ a LemServ aprova a conta primeiro.
- **D8 — Danos e perdas na devolução:** só registar, ou cobrar? *(A caução continua fora do âmbito por agora.)*

**Pronto quando:** visual escolhido e decisões D2–D8 registadas neste documento.

---

## Etapa 1 — Novo visual (base)

**O que inclui**
- Novas cores, tipografia e espaçamentos com a identidade LemServ (tema claro e escuro).
- Novo layout: barra lateral moderna em vez da barra de módulos do Dolibarr, cabeçalho com pesquisa, menu de telemóvel.
- Componentes comuns redesenhados (cartões, tabelas, estados, botões, formulários, fichas). Como todas as páginas os usam, o sistema inteiro muda de uma vez.
- Os fluxos (rascunho → validar, separadores, objectos relacionados) mantêm-se: muda o aspecto, não as regras.

**Pronto quando:** todas as páginas actuais funcionam com o novo visual, no computador e no telemóvel, e os testes continuam a verde.

---

## Etapa 2 — Produtos de aluguer

**O que inclui**
- Na ficha do produto: **preço por dia**, **quantidade total** que a LemServ possui e **categoria** (Lounge, Tendas, Mesas e cadeiras, Decoração, Serviços…).
- **Fotos** do produto: várias, com uma principal, em JPG, PNG ou WebP, reduzidas automaticamente para o telemóvel.
- **Loja:** opção "Mostrar na loja", com descrição para o cliente, ordem e destaque.
- Lista de produtos com miniatura, quantidade e disponibilidade.

**Pronto quando:** consegues carregar fotos, escolher o que aparece na loja e ver a quantidade de cada produto.

**Feito (10/10/2026):**
- Categorias em Produtos → Categorias (criar, renomear, ordenar; não se apaga uma categoria com produtos). Iniciais: Lounge, Tendas, Mesas e cadeiras, Decoração, Serviços.
- Ficha do produto com separadores **Ficha**, **Fotos** e **Loja**. O formulário está em secções: Identificação, Preços e quantidade, Loja.
- Preço por dia (sem IVA, com o IVA calculado ao lado), "Aluga-se" e "Vende-se" independentes, quantidade que a LemServ tem (os serviços não têm quantidade).
- Fotos: até 12 por produto, JPG, PNG ou WebP até 15 MB. Cada foto é endireitada (fotos de telemóvel), reduzida e guardada em WebP em três tamanhos (1600, 800 e 320 px), fora da pasta pública. A primeira fica principal; pode-se trocar a principal, mudar a ordem, ampliar e apagar.
- Loja: "Mostrar aos clientes", destaque, posição e descrição para o cliente, com pré-visualização do cartão da loja (preço com IVA) e aviso quando falta foto ou preço por dia.
- Lista de produtos com foto, categoria, preço por dia, preço de venda, quantidade e estado (Aluguer, Venda, Loja); filtros por categoria e estado.
- Orçamentos, encomendas e facturas já mostram os produtos só de aluguer e propõem o preço por dia (a linha vale 1 dia até à etapa 5).
- Auditoria das alterações (incluindo fotos), 11 testes novos.

**Fica para as etapas seguintes:**
- A quantidade escreve-se à mão até ao módulo de stock (etapa 3), que também traz a coluna "Disponível".
- As fotos só se vêem com sessão iniciada. O site público (etapa 7) passa a mostrar as dos produtos marcados para a loja.

---

## Etapa 3 — Stock

**O que inclui**
- **Movimentos de stock:** entrada (compra recebida, ligada ao módulo Compras), saída (aluguer), devolução, perda ou dano, e ajuste de inventário. Cada um com data, quantidade, motivo e quem fez.
- Na ficha do produto: **total**, **alugado agora**, **reservado para datas futuras**, **disponível hoje**.
- **Disponibilidade por data:** "quantas cadeiras Tiffany estão livres de 14 a 16 de Novembro?". É a base da loja.
- Inventário: contagem física com correcção das diferenças.

**Regras:** o stock nunca fica negativo; cada mudança fica registada; a entrada das compras recebidas actualiza o stock (era o que faltava na Fase 4.1).

**Pronto quando:** comprar, alugar e devolver mexem nas quantidades certas e a disponibilidade por data está correcta, com testes.

**Feito (10/10/2026):**
- **Produtos e stock numa só página** (pedido do utilizador, para não haver redundâncias): a lista de produtos mostra preços e quantidades (total, alugadas, no armazém), o resumo do stock e as devoluções em atraso. No menu, "Produtos e stock" agrupa a lista, a disponibilidade por data, os movimentos, os inventários e as categorias. O antigo endereço /stock leva à lista. Separador **Stock** na ficha de cada produto.
- Movimentos: quantidade inicial, entrada, saída para aluguer (com cliente, evento e devolução prevista), devolução (sempre contra a saída de onde as peças vieram), perda ou dano (do armazém ou de peças que não voltaram) e ajuste. Os movimentos não se apagam: um engano corrige-se com outro movimento.
- Na ficha: total, alugadas agora (com atrasos), no armazém, peças fora por saída com "Registar devolução", e o histórico.
- Disponibilidade por data: escolhe-se o período (com atalhos Hoje, Amanhã, Fim-de-semana, Próximos 7 dias) e vê-se, por produto, quantas peças estão livres em todos os dias.
- Inventário: folha de contagem (também para imprimir); conta-se o que está no armazém e as peças alugadas somam-se sozinhas. Só os produtos com diferença recebem um ajuste.
- Compras: receber uma encomenda a fornecedor dá entrada em stock das linhas com produtos (peças inteiras). Reabrir a encomenda anula essas entradas, mas não se as peças já estiverem alugadas.
- A quantidade escrita na etapa 2 passou a ser o primeiro movimento de cada produto. Na ficha, a quantidade só se escreve ao criar o produto.
- Painel com uma só caixa "Produtos e stock" (em aluguer, peças alugadas, atrasos, esgotados, na loja). Novas permissões: stock.ver, stock.movimentar e stock.inventariar. 12 testes novos.

**Decisões tomadas por agora (confirmar):**
- **D3:** o dia previsto de devolução conta como ocupado (as peças voltam durante o dia e não se prometem a outro cliente nesse dia). O dia de entrega também conta. Quando a etapa 5 trouxer os dias à factura, decide-se à parte quantos dias se cobram.
- Saídas sem data prevista, ou já atrasadas, contam como fora em todo o período consultado.

**Fica para a etapa 4:** "Reservadas" na ficha e as reservas confirmadas na disponibilidade (D4). Peças em reparação (temporariamente indisponíveis) também podem entrar aí, se fizer falta.

---

## Etapa 4 — Aluguer: reservas, saída e devolução

**O que inclui**
- Novo documento **Reserva / Aluguer** (`AL2026/0001`): cliente, **data do evento**, data de entrega e de recolha, local, transporte, tema de cores, linhas com quantidade e dias.
- Estados: **Pedido** (vindo da loja ou criado no balcão) → **Confirmada** (prende o stock) → **Entregue / Saída** (o stock sai) → **Devolvida** (o stock volta, com registo de faltas e danos) → **Facturada**. Também **Cancelada**.
- **Calendário** de reservas e alerta quando não há quantidade suficiente.
- Lista de saída e de devolução para a equipa (peça a peça, para imprimir ou ver no telemóvel).

**Pronto quando:** o ciclo completo funciona e o stock acompanha cada passo.

**Feito (10/10/2026):**
- Menu **Aluguer → Reservas** (lista e calendário). Reserva `AL2026/0001` com cliente, evento (um ou vários dias), entrega e recolha, dias a cobrar, local, contacto no local, transporte, tema de cores, observações e nota interna.
- Linhas com **dias**: total = quantidade × dias × preço por dia − desconto (+ IVA). O material de aluguer leva os dias da reserva; os serviços, 1. Mudar os dias da reserva actualiza as linhas de material. O material conta-se em peças inteiras.
- Estados: **Pedido** → **Confirmada** → **Entregue** → **Devolvida**; Pedido/Confirmada → **Cancelada** → (reabrir) Pedido; Confirmada → voltar a Pedido.
- **Stock:** o pedido não prende material; a confirmação prende-o do dia da entrega ao da recolha, e só se confirma se houver material livre em todos esses dias (cada linha mostra quantas peças estão livres e quantas faltam). Numa reserva confirmada, cada alteração volta a verificar. A entrega faz a saída de stock (com devolução prevista no dia da recolha); a devolução, de uma vez ou aos poucos, regista o que voltou e abate o que se perdeu ou partiu.
- Disponibilidade por data e ficha do produto (Reservadas, Próximas reservas) já contam as reservas confirmadas.
- **Calendário** do mês (no telemóvel, agenda por dia) e **lista para a equipa**, sem preços, para imprimir ou usar no telemóvel com vistos de "Saiu" e "Voltou".
- Painel com a caixa Reservas (pedidos por confirmar, entregas próximas, recolhas em atraso). Permissões: reservas.ver, reservas.criar, reservas.confirmar, reservas.entregar. 8 testes novos.

**Decisões (confirmadas pela utilizadora a 11/10/2026):**
- **D4:** o pedido não prende o material; só a confirmação.
- **D2:** todos os dias ao mesmo preço; descontos por linha, à mão.
- **D5/D6:** o transporte é uma linha de serviço e o tema de cores é texto livre.

---

## Etapa 5 — Facturação por dia

**O que inclui**
- As linhas de orçamentos, encomendas, reservas e facturas passam a ter **dias**: total = quantidade × dias × preço por dia − desconto (+ IVA).
- O período do documento (início e fim) propõe os dias de cada linha. Serviços sem dias (ex.: transporte) mantêm 1.
- Os documentos impressos mostram a coluna "Dias" e o período do aluguer.
- "Criar factura" a partir de uma reserva devolvida.

**Atenção:** os documentos já validados não mudam de valor (os actuais ficam com 1 dia).

**Pronto quando:** uma reserva de 3 dias de 20 cadeiras gera a factura certa, com testes.

**Feito (11/10/2026):**
- As linhas de orçamentos, reservas, facturas e notas de crédito têm **Dias** (total = quantidade × dias × preço por dia − desconto). As linhas que já existiam ficaram com 1 dia: nenhum documento mudou de valor.
- **Criar factura** na reserva (confirmada, entregue ou devolvida): a factura leva as linhas com os dias, os termos de pagamento do cliente e a ligação à reserva. Uma reserva só tem uma factura activa (se for abandonada, pode facturar-se de novo).
- **Orçamento aceite → Criar reserva** (pergunta as datas do evento); deixou de haver "Criar encomenda".
- A factura impressa mostra a reserva, o evento, a entrega e recolha, e as colunas "Dias" e "P.U./dia" quando há aluguer de mais de um dia.
- A nota de crédito que copia as linhas da factura leva também os dias.
- 3 testes novos (130 no total).

**Redundâncias retiradas (pedido da utilizadora):**
- **Encomendas de venda** saíram do menu, do painel, da pesquisa rápida e da ficha do cliente (as reservas fazem esse papel). As que já existiam continuam acessíveis pelas ligações dos documentos.
- As páginas de "área" ao estilo Dolibarr (Área comercial, Área de facturação, Compras → Resumo) repetiam o painel e as listas: foram retiradas e os endereços antigos levam às listas.
- Menu: um só grupo **Comercial** (Reservas, Orçamentos, Facturas — com Notas de crédito e Pagamentos recebidos — e Clientes e fornecedores).
- Painel: saíram "Últimas facturas", "Clientes recentes", "Produtos alterados", a caixa de contagens de terceiros e a lista de estatísticas (cópias das listas). Ficaram as caixas por área, o gráfico, o que há por receber e os maiores devedores.
- Na ficha do cliente, "Encomendas" passou a "Reservas" (com "Nova reserva").

**Regra legal (11/10/2026):** a numeração segue as datas. Uma factura ou nota de crédito não se valida com data anterior à da última já validada da mesma série e ano; a mensagem diz qual é e a partir de que dia se pode validar.

---

## Etapa 6 — Perfil Cliente: registo, login e área do cliente

**O que inclui**
- Novo perfil **Cliente**: acede só à loja e à sua área. Nunca vê o sistema interno.
- **Página de registo:** nome, telemóvel (WhatsApp), e-mail, NUIT opcional, morada (província, cidade, bairro, rua) e senha. Cria automaticamente o terceiro (cliente) no LemGest.
- **Login do cliente**, recuperação de senha e, se escolhido em D7, aprovação da conta pela LemServ.
- **Área do cliente:** os seus dados, as suas reservas e os seus recibos.

**Pronto quando:** um cliente regista-se, entra e vê só o que é dele. Um funcionário nunca entra na loja como cliente, e um cliente nunca entra no sistema interno.

**Feito (11/10/2026):**
- **Contas de clientes separadas da equipa:** outra tabela, outra sessão (guarda "cliente") e outra entrada (`/conta/entrar`). As rotas internas exigem a sessão da equipa; a área do cliente exige uma conta de cliente activa. Um e-mail da equipa não pode criar conta de cliente.
- **Registo** (`/conta/registar`): nome, telemóvel (WhatsApp, normalizado para +258 8X XXX XXXX), e-mail, NUIT opcional, província, cidade, bairro, rua e senha. Fica **por aprovar** (D7).
- **Aprovação** em Clientes e fornecedores → **Contas de clientes**: o sistema sugere fichas com o mesmo NUIT, e-mail ou telemóvel; aprova-se ligando a uma ficha existente ou criando uma nova (para não repetir clientes). Também se recusa, suspende e reactiva, com motivo, que o cliente vê ao tentar entrar. Uma conta suspensa sai no pedido seguinte.
- **Área do cliente** (`/conta`): próximas reservas e facturas por pagar; lista e detalhe das reservas (com linhas, dias e totais); facturas em A4 para imprimir ou guardar em PDF, sem as notas internas; os seus dados e mudança de senha; "Esqueci-me da senha" por e-mail.
- Painel: "Contas de clientes por aprovar"; ficha do cliente: contas da loja ligadas. Nova permissão terceiros.contas (Gestor e Comercial). 10 testes novos.

**Limites por agora:**
- Os e-mails (nova senha) ficam no ficheiro de registo até se configurar o envio (SMTP), na publicação online (etapa 11).
- O cliente ainda não reserva sozinho: isso é a loja (etapa 8). Também não recebe aviso quando a conta é aprovada (WhatsApp, etapa 10).

---

## Etapa 7 — Site público

**O que inclui**
- Página inicial pública da LemServ: apresentação, serviços (montagem, decoração, transporte), galeria e catálogo dos produtos marcados "Mostrar na loja", com fotos.
- Botões "Criar conta" e "Entrar" para reservar, e contacto por WhatsApp.
- Pensado primeiro para o telemóvel, rápido e com boa aparência ao partilhar a ligação (pré-visualização no WhatsApp).

**Pronto quando:** quem não tem conta vê os produtos e serviços. Para reservar pede-se o registo.

---

## Etapa 8 — Loja: catálogo, carrinho e reserva

**O que inclui**
- **Catálogo** (só clientes com sessão): categorias, pesquisa, fotos, preço por dia e disponibilidade para a data escolhida.
- **Carrinho:** quantidades, dias e total estimado, sem deixar pedir mais do que o disponível.
- **Finalizar reserva:**
  - dados do cliente **preenchidos automaticamente**;
  - **data do evento** (e duração);
  - **local** (etapa 9);
  - **transporte** sim ou não, com o custo segundo D5;
  - **tema de cores** (lista de D6);
  - observações.
- Submeter cria a **Reserva em estado "Pedido"** no LemGest e mostra o **comprovativo** (número, dados, linhas e totais), que também fica na área do cliente.

**Pronto quando:** um cliente faz uma reserva completa no telemóvel e ela aparece no LemGest para a LemServ confirmar.

---

## Etapa 9 — Local do evento: ruas de Moçambique

**O que inclui**
- Campo de pesquisa que **sugere ruas e locais de Moçambique enquanto se escreve**, mais um **mapa** para afinar o ponto exacto. Usa os dados do OpenStreetMap, que é gratuito e tem as ruas de Maputo, Matola e outras cidades.
- Alternativa sem internet: província → cidade → bairro, e a rua escrita à mão.
- O ponto do mapa fica guardado na reserva: a equipa de entrega abre-o no Google Maps.

**Limites:** precisa de internet no telemóvel do cliente. Os serviços gratuitos têm limites de uso, que chegam para o volume da LemServ.

**Pronto quando:** o cliente escolhe a rua ou o ponto no mapa, e a localização aparece na reserva.

---

## Etapa 10 — WhatsApp

**O que inclui**
- Quando o cliente faz a reserva, o LemGest envia **duas mensagens para o número da dona** (agora, o teu):
  1. **Confirmação com os dados e o recibo:** cliente, contactos, data, local, transporte, tema, linhas com preços, total e ligação para o recibo em PDF;
  2. **Lista sem preços**, só material e quantidades, data, local e tema, pronta a **reencaminhar para o grupo** da equipa.
- O número e a chave do serviço configuram-se em Administração → Configuração.
- Se o envio falhar (sem internet), a reserva fica marcada para reenvio, e há um botão "Enviar por WhatsApp" que abre a conversa já escrita.

**❓ Decisão D9 — serviço de envio**
- **Para testar no teu número:** CallMeBot (gratuito, só texto, só para o próprio número). O recibo vai como ligação.
- **Para produção:** WhatsApp Business (API oficial da Meta) ou um fornecedor como a Twilio. Permite anexar o PDF, mas exige verificar o número da empresa e tem custo por mensagem.

**Limites:**
- **Grupos:** nenhum serviço oficial envia mensagens directamente para grupos de WhatsApp, por isso a dona reencaminha a lista.
- **Internet:** o envio precisa de internet no computador do LemGest.

**Pronto quando:** cada reserva nova chega ao teu WhatsApp com o recibo e a lista sem preços.

---

## Etapa 11 — Publicação online

Hoje o LemGest só funciona neste computador e no Wi-Fi local. Para **clientes reais** reservarem a partir de casa, a loja tem de estar na internet:

- alojamento (servidor com PHP e MySQL) e **domínio** (ex.: `lemserv.co.mz`);
- **HTTPS** obrigatório (senhas e dados pessoais);
- cópias de segurança automáticas;
- envio de WhatsApp e e-mail a partir do servidor.

**❓ Decisão D10:** quando publicar e onde (alojamento em Moçambique ou fora). Até lá, tudo funciona e demonstra-se localmente, também no telemóvel pelo Wi-Fi.

---

## O que já existe e é reaproveitado

- Terceiros, produtos, numeração sem saltos, linhas e totais dos documentos, impressão A4 com logótipo, permissões por perfil, auditoria.
- Compras: a recepção de material passa a dar entrada em stock (etapa 3).
- Configuração da empresa: número de WhatsApp, temas e preços de transporte entram lá.
- Acesso no telemóvel pelo Wi-Fi e modo aplicação no iPhone (já feito).

## Fora do âmbito (por agora)

Pagamento online na loja (M-Pesa, e-Mola, cartão), caução e multas, kits/pacotes, aplicação nas lojas da Apple e da Google.
