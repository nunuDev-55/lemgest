<?php

/*
 * Funções partilhadas por exportar.php e instalar.php (passar o LemGest para outro computador).
 * Correm com o PHP do XAMPP, fora do Laravel.
 */

const XAMPP = 'C:\\xampp';

function raiz(): string
{
    return dirname(__DIR__);
}

/** Lê o .env do projecto (só pares CHAVE=valor). @return array<string, string> */
function lerEnv(): array
{
    $ficheiro = raiz().'/.env';
    if (! is_file($ficheiro)) {
        falhar('Não encontrei o ficheiro .env na pasta do projecto.');
    }
    $env = [];
    foreach (file($ficheiro, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linha) {
        if (str_starts_with(trim($linha), '#') || ! str_contains($linha, '=')) {
            continue;
        }
        [$chave, $valor] = explode('=', $linha, 2);
        $env[trim($chave)] = trim(trim($valor), "\"'");
    }

    return $env;
}

/**
 * Corre um programa sem passar pela linha de comandos (os argumentos não precisam de aspas).
 * A senha do MySQL vai por variável de ambiente, para não aparecer na lista de processos.
 *
 * @param  list<string>  $comando
 * @return array{0: int, 1: string}
 */
function correr(array $comando, ?string $entrada = null, ?string $saida = null, array $ambienteExtra = []): array
{
    $descritores = [
        0 => $entrada ? ['file', $entrada, 'r'] : ['pipe', 'r'],
        1 => $saida ? ['file', $saida, 'w'] : ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $processo = proc_open($comando, $descritores, $pipes, raiz(), $ambienteExtra + getenv());
    if (! is_resource($processo)) {
        falhar('Não consegui correr '.$comando[0]);
    }
    if (! $entrada) {
        fclose($pipes[0]);
    }
    $texto = $saida ? '' : stream_get_contents($pipes[1]);
    $texto .= stream_get_contents($pipes[2]);

    return [proc_close($processo), trim($texto)];
}

function titulo(string $texto): void
{
    echo PHP_EOL."== {$texto}".PHP_EOL;
}

function ok(string $texto): void
{
    echo "   [ok] {$texto}".PHP_EOL;
}

function aviso(string $texto): void
{
    echo "   [!]  {$texto}".PHP_EOL;
}

function falhar(string $texto): never
{
    echo PHP_EOL."   [ERRO] {$texto}".PHP_EOL.PHP_EOL;
    exit(1);
}

function perguntar(string $pergunta): string
{
    echo "   {$pergunta} ";

    return trim((string) fgets(STDIN));
}
