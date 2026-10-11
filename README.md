# LemGest — Sistema de gestão empresarial

Sistema de gestão (ERP) para pequenas e médias empresas moçambicanas, desenvolvido como projecto de monografia. Empresa-piloto: LemServices (LemServ — Lounge e Outdoor).

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript, Tailwind CSS 4, componentes shadcn/ui |
| Ligação frontend/backend | Inertia.js 2 |
| Backend | Laravel 12 (PHP 8.2) |
| Base de dados | MariaDB 10.4 (XAMPP) |

As bibliotecas usadas são de código aberto (licença MIT na maioria); o código da aplicação pertence a Nuryan Sultane (ver [LICENSE](LICENSE)).
A organização dos ecrãs segue o Dolibarr como **referência funcional** (análise em `docs/analise-dolibarr/`); nenhum código do Dolibarr é copiado.

## Módulos

Início · Terceiros (clientes, potenciais, fornecedores, contactos) · Produtos | Serviços · Comércio (orçamentos, encomendas) · Facturação | Pagamento (facturas, notas de crédito, pagamentos) · Compras (encomendas e facturas de fornecedores, pagamentos) · Administração (configuração da empresa, utilizadores, perfis e permissões, auditoria). Plano completo em `docs/ROADMAP.md`.

## Requisitos

- XAMPP com PHP 8.2 (Apache e MySQL/MariaDB)
- Node.js 18 ou superior
- Composer (instalado em `C:\xampp\php\composer.bat`)

## Arrancar

1. No XAMPP Control Panel, ligar o **Apache** e o **MySQL**.
2. Fazer duplo clique em `iniciar.bat` (abre `http://127.0.0.1:8088`, servido pelo Apache do XAMPP).
3. No primeiro acesso, clicar em **"Criar a conta de administrador"**. Depois disso o registo público fica fechado.

### Ambiente de demonstração (dados fictícios)

`http://127.0.0.1:8089` usa o mesmo código com a base de dados `lemgest_demo` (clientes, produtos e facturas fictícios da LemServ), para testar e para a defesa da monografia sem tocar nos dados reais. As credenciais de entrada estão em `database/seeders/DemoSeeder.php`.

Para repor os dados de demonstração, fazer duplo clique em `recriar-demo.bat` (apaga e recria **só** a base `lemgest_demo`).

### Desenvolvimento

```bash
npm run dev
```

Frontend com recarregamento automático; o backend continua no Apache (porta 8088). Sem o `npm run dev` ligado, depois de alterar o frontend compilar com `npm run build`.

## Qualidade

```bash
C:\xampp\php\php.exe artisan test     # testes automáticos
npx tsc --noEmit                      # verificação de tipos
npx eslint resources/js               # regras de código
C:\xampp\php\php.exe vendor/bin/pint  # formatação PHP
```

## Configuração

O ficheiro `.env` (não incluído no controlo de versões) contém a ligação à base de dados `lemgest` e a chave da aplicação. Os dados da empresa que aparecem nos documentos (NUIT, morada, logótipo, rodapés) alteram-se em **Administração → Configuração**; `config/lemgest.php` só tem os valores iniciais.

## Autor e licença

**Nuryan Sultane** — © 2026. Todos os direitos reservados.

Software proprietário: não pode ser copiado, distribuído nem usado sem autorização do autor. Os componentes de terceiros e as respectivas licenças estão indicados em [LICENSE](LICENSE).
