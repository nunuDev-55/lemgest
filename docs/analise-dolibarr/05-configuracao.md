# Análise funcional — Dolibarr 24: Configuração (empresa, documentos e numeração)

Estudo feito a partir da utilização do Dolibarr 24.0.2. O LemGest reproduz as funcionalidades com código próprio.

## 1. Onde fica

No Dolibarr, a configuração está em **Início → Configuração**. A primeira página pede para completar, por esta ordem, os dados da **Empresa/Organização** e os **Módulos**. Enquanto os dados da empresa não estão preenchidos, o Início mostra um aviso.

## 2. Empresa / Organização

| Bloco | Campos |
|---|---|
| Identidade | Nome / razão social · Morada · Código postal · Cidade · País · Província · Moeda · Telefone · Fax · E-mail · Website · Logótipo (e versão quadrada) · Nota |
| Identificação legal | Gestor(es) · Capital social · Forma jurídica · Data de fundação · IDs profissionais 1 a 6 (dependem do país) · Número de IVA · Objecto / actividade |
| Fiscal | Início do ano fiscal · Sujeito a IVA ou não |

O logótipo é usado no topo do menu e em todos os documentos gerados (PDF).

## 3. Textos e opções dos documentos

Cada módulo (Orçamentos, Encomendas, Facturas) tem a sua página de configuração com:
- **Modelos de numeração** (ex.: `FA2610-0001`), com o próximo valor mostrado ao lado de cada modelo;
- **Modelos de documento** (PDF) e marca de água em rascunhos;
- **Texto livre** acrescentado no fim de cada documento (condições, dados bancários, avisos legais);
- No caso dos orçamentos, a **duração de validade por omissão**.

## 4. Numeração

A numeração é escolhida por módulo. Depois de haver documentos validados, mudar de modelo não renumera os anteriores. O número só é atribuído ao validar (os rascunhos têm uma referência provisória `(PROVn)`).

## Adaptações do LemGest

- **Administração → Configuração** junta numa só área as três páginas: *Empresa / Organização*, *Documentos* e *Numeração*. Só quem tem a permissão `configuracao.gerir` lá entra (de origem, só o Administrador).
- Identificação legal adaptada a Moçambique: **NUIT** (9 dígitos), **NUEL** (Número Único da Entidade Legal), forma jurídica (Lda, SU Lda, SA, empresário em nome individual) e capital social.
- O logótipo é guardado fora da pasta pública e servido por uma rota autenticada. Aceita PNG, JPG ou WebP até 2 MB; não aceita SVG, que pode conter código.
- Os textos de rodapé (factura, orçamento, encomenda) e os dados para pagamento (M-Pesa, e-Mola, conta bancária) aparecem no fim dos documentos impressos.
- A numeração é fixa e não se edita: as séries `FT`, `NC`, `OR`, `EN` e `PG` recomeçam em cada ano e não podem ter saltos (exigência fiscal). A página *Numeração* mostra o último número atribuído e o próximo.
- O Início avisa o administrador enquanto faltar o NUIT da empresa, tal como o Dolibarr avisa quando a configuração não está completa.
- Cada alteração fica na auditoria (módulo *Configuração*), com o valor anterior e o novo.
