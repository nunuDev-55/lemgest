<?php

/*
 * Prepara a cópia do LemGest para levar para outro computador:
 *   1. exporta as bases de dados (lemgest e lemgest_demo) para instalacao/dados/;
 *   2. cria um único ficheiro .zip com o projecto (sem node_modules), ao lado da pasta do projecto.
 */

require __DIR__.'/comum.php';

$env = lerEnv();
$bdPrincipal = $env['DB_DATABASE'] ?? 'lemgest';
$ligacao = [
    '--host='.($env['DB_HOST'] ?? '127.0.0.1'),
    '--port='.($env['DB_PORT'] ?? '3306'),
    '--user='.($env['DB_USERNAME'] ?? 'root'),
];
$senha = ['MYSQL_PWD' => $env['DB_PASSWORD'] ?? ''];

titulo('1. Bases de dados');
$mysqldump = XAMPP.'\\mysql\\bin\\mysqldump.exe';
if (! is_file($mysqldump)) {
    falhar("Não encontrei {$mysqldump}.");
}
$dados = __DIR__.'/dados';
if (! is_dir($dados)) {
    mkdir($dados, 0777, true);
}

foreach ([$bdPrincipal, 'lemgest_demo'] as $bd) {
    $ficheiro = "{$dados}/{$bd}.sql";
    [$codigo, $erro] = correr(
        [$mysqldump, ...$ligacao, '--single-transaction', '--routines', '--add-drop-table', '--default-character-set=utf8mb4', $bd],
        saida: $ficheiro,
        ambienteExtra: $senha,
    );
    if ($codigo !== 0) {
        @unlink($ficheiro);
        if ($bd === 'lemgest_demo') {
            aviso("Base {$bd} não exportada (talvez não exista neste computador): {$erro}");

            continue;
        }
        falhar("Não consegui exportar a base {$bd}. O MySQL está ligado no XAMPP?\n          {$erro}");
    }
    ok("{$bd} → instalacao/dados/{$bd}.sql (".number_format(filesize($ficheiro) / 1024, 0, ',', ' ').' KB)');
}

titulo('2. Ficheiro para copiar');
$pasta = basename(raiz());
$destino = dirname(raiz()).DIRECTORY_SEPARATOR.'LemGest-copia-'.date('Y-m-d').'.zip';
@unlink($destino);
[$codigo, $erro] = correr([
    'tar', '-a', '-c', '-f', $destino,
    '--exclude=node_modules', '--exclude=.git', '--exclude=*.log',
    '-C', dirname(raiz()), $pasta,
]);
if ($codigo !== 0) {
    falhar("Não consegui criar o .zip: {$erro}");
}
ok($destino.' ('.number_format(filesize($destino) / 1048576, 1, ',', ' ').' MB)');

echo PHP_EOL.'   Copie este ficheiro para o outro computador (pen, disco externo...).'.PHP_EOL;
echo '   ATENÇÃO: leva as bases de dados e o ficheiro .env (senhas). Guarde-o em lugar seguro.'.PHP_EOL;
echo '   No outro computador siga instalacao/LEIA-ME.md (extrair e correr instalar.bat).'.PHP_EOL.PHP_EOL;
