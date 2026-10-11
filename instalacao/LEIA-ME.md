# Passar o LemGest para outro computador

Tudo corre localmente, sem internet e sem servidor externo.

## No computador onde o LemGest já funciona

1. No XAMPP Control Panel, confirme que o **MySQL** está ligado.
2. Faça duplo clique em `instalacao\exportar.bat`.
3. É criado o ficheiro `LemGest-copia-AAAA-MM-DD.zip` **ao lado** da pasta do projecto (por exemplo `C:\projectos\`). Leva o código, as duas bases de dados (real e demonstração), o logótipo e a configuração.
4. Copie esse `.zip` para uma pen ou um disco externo.

> O `.zip` contém os dados da empresa e o ficheiro `.env` com as senhas. Guarde-o em lugar seguro.

## No computador novo

1. Instale o **XAMPP com PHP 8.2** na pasta `C:\xampp` (apachefriends.org).
2. Abra o XAMPP Control Panel e ligue o **MySQL** (Start).
3. Extraia o `.zip` para uma pasta, por exemplo `C:\projectos\` (fica `C:\projectos\lemgest`).
4. Faça duplo clique em `lemgest\instalacao\instalar.bat`. O instalador:
   - liga no `php.ini` as extensões do PHP que faltarem;
   - cria as bases `lemgest` e `lemgest_demo`, o utilizador do MySQL e importa os dados (se já existirem, pergunta antes de substituir);
   - configura o Apache para os endereços `http://127.0.0.1:8088` (real) e `:8089` (demonstração);
   - cria os atalhos **LemGest** e **LemGest (demonstração)** no ambiente de trabalho e no menu Iniciar.
5. No XAMPP Control Panel, ligue (ou reinicie) o **Apache**.
6. Abra o LemGest pelo atalho do ambiente de trabalho.

Não é preciso instalar o Node.js nem o Composer no computador novo: a cópia já leva o frontend compilado e as bibliotecas.

### Antivírus

O `instalar.php` cria um utilizador no MySQL e altera o `php.ini` e a configuração do Apache. Alguns antivírus (o Avast, por exemplo) consideram isso suspeito e põem o ficheiro em **quarentena**: o instalador pára a meio e o `instalar.php` desaparece da pasta. Se acontecer:

1. Abra o antivírus → **Quarentena** → restaure o `instalar.php`.
2. Acrescente a pasta do LemGest às **excepções** do antivírus.
3. Volte a correr `instalar.bat`.

## Abrir como aplicação

O atalho **LemGest** (ou `iniciar.bat`):

1. abre logo uma **janela própria**, sem barra de endereços nem separadores, com o **ecrã de arranque** (`instalacao/arranque.html`): logótipo, barra de progresso e os passos "A ligar o servidor", "A ligar a base de dados" e "A abrir o LemGest";
2. ao mesmo tempo liga o MySQL e o Apache do XAMPP, se estiverem desligados (sem abrir janelas pretas);
3. quando o sistema responde, o ecrã de arranque dá lugar ao LemGest na mesma janela. Se ao fim de 75 segundos não responder, diz o que fazer e mostra o botão "Tentar outra vez".

A janela usa o motor do Microsoft Edge (que vem com o Windows) em "modo aplicação", tal como muitos programas de ambiente de trabalho. Tem um perfil separado, por isso não se mistura com o navegador normal: na primeira vez pede o login.

Se mudar a pasta do projecto de sítio, volte a criar os atalhos com duplo clique em `instalacao\criar-atalhos.vbs`.
