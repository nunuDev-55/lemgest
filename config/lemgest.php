<?php

/*
 * Valores iniciais dos dados da empresa (da factura FACTURA119).
 * Depois de gravados em Administração → Configuração → Empresa / Organização,
 * passam a valer os da base de dados (tabela definicoes, ver App\Support\Definicoes).
 */
return [
    'empresa' => [
        'nome' => env('EMPRESA_NOME', 'Lemservicos SU, Lda'),
        'nome_comercial' => env('EMPRESA_NOME_COMERCIAL', 'LemServ'),
        'forma_juridica' => 'su_lda',
        'morada' => env('EMPRESA_MORADA', 'Matola G'),
        'cidade' => env('EMPRESA_CIDADE', 'Matola'),
        'provincia' => env('EMPRESA_PROVINCIA', 'MZ-L'),
        'telefone' => env('EMPRESA_TELEFONE', '+258 84 122 1986'),
        'email' => env('EMPRESA_EMAIL', 'lemservicos@gmail.com'),
        'nuit' => env('EMPRESA_NUIT'),
        'banco' => env('EMPRESA_BANCO'),
    ],
];
