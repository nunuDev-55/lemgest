# Análise funcional — Dolibarr 24: Início

Estudo da página inicial do Dolibarr 24.0.2 (`index.php?mainmenu=home`), feito a partir da utilização do sistema.
O LemGest reproduz as **funcionalidades e a organização** com código próprio; nenhum código do Dolibarr é copiado.

## 1. Menu à esquerda

| Entrada | Função |
|---|---|
| O meu painel de controlo | Esta página |
| Configuração | Empresa, módulos, dicionários (no LemGest: módulo "Empresa e configurações", plano 1.2) |
| Ferramentas de administrador | Cópias de segurança, informação do sistema |
| Utilizadores e Grupos | Gestão de utilizadores e permissões |

## 2. "Vista global" — caixas por módulo

No topo, uma caixa por módulo activo, cada uma com o ícone do módulo, o nome em maiúsculas e contadores que levam à lista filtrada:

| Caixa | Contadores |
|---|---|
| Vista global | Total de documentos **em atraso** |
| Agenda | Acções a realizar |
| Orçamentos | Para aceitar/recusar · Por facturar |
| Encomendas | Abertas · Entregues e por facturar |
| Facturas | Pendentes (o número fica **vermelho** quando há facturas vencidas) |
| Conta bancária | Cheques a depositar |
| Relatórios de despesas | Para aprovar · A pagar |

## 3. Caixas de informação (widgets)

Cada caixa tem título e pode ser movida ou fechada pelo utilizador:

- **Informações de login**: utilizador, login anterior (data, hora e IP), última alteração de senha.
- **Facturas de cliente por mês**: dois gráficos separados — número de facturas e montante sem IVA (nunca no mesmo eixo).
- **Facturas de cliente: últimas modificadas**: referência, cliente, montante, data.
- **Facturas de cliente: mais antigas não pagas**: referência, cliente, montante, vencimento, com linha de total.
- **Clientes: últimos modificados**; **Potenciais clientes: últimos modificados**.
- **Produtos/serviços: últimos modificados**; **alerta de stock**.
- **Clientes com valor máximo pendente excedido**.
- **Estatísticas da base de dados**: utilizadores, clientes, potenciais, contactos, produtos, serviços, orçamentos, encomendas, facturas.
- **Eventos**: os mais antigos por realizar e os próximos.

## 4. Regras observadas

1. Cada pessoa só vê as caixas dos módulos a que tem acesso.
2. Os números são ligações: levam à lista já filtrada.
3. O atraso é destacado a vermelho, para chamar a atenção.

## Adaptações do LemGest

- Caixas para os módulos que já existem: Facturas, Pagamentos, Terceiros, Produtos e serviços.
- "Login anterior" vem do registo de auditoria (cada entrada fica registada).
- Gráfico do valor facturado nos últimos 12 meses, com o número de facturas na dica (um só eixo).
- Em vez de "valor máximo pendente excedido" (o LemGest ainda não tem limite de crédito por cliente): **clientes com mais valor por receber**.
