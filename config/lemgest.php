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

    /*
     * Notas de crédito: a dona da LemServ quer usá-las (2026-10-17, depois de as ter desligado a 2026-10-11).
     * LEMGEST_NOTAS_CREDITO=false no .env tira o botão "Nota de crédito" da factura e impede criar novas;
     * as que já existem continuam a ver-se (tire também a entrada do menu em resources/js/lib/navegacao.ts).
     */
    'notas_credito' => (bool) env('LEMGEST_NOTAS_CREDITO', true),

    /*
     * Publicação do site na internet (decisão D10). Vazio = instalação local, sem restrições.
     * - LEMGEST_DOMINIO_PUBLICO=lemserv.co.mz: nesse endereço só abrem o site, o catálogo e a área do cliente.
     * - LEMGEST_REDES_SISTEMA=192.168.1.0/24: o sistema interno só abre a partir destas redes (separadas por vírgulas).
     *   Atenção: com um túnel ou proxy na própria máquina os pedidos chegam de 127.0.0.1; aí use o domínio público.
     */
    'publicacao' => [
        'dominio_publico' => env('LEMGEST_DOMINIO_PUBLICO'),
        'redes_sistema' => array_values(array_filter(array_map('trim', explode(',', (string) env('LEMGEST_REDES_SISTEMA', ''))))),
    ],
];
