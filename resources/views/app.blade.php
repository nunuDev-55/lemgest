<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'LemGest') }}</title>

        <meta name="theme-color" content="#6e2a63">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- Telemóvel: "Adicionar ao ecrã principal" abre o LemGest como aplicação (ecrã inteiro, sem as barras do navegador) --}}
        <link rel="manifest" href="/manifest.json">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="LemGest">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead

        {{-- Ecrã de carregamento enquanto o JavaScript da página ainda não chegou (desaparece quando o React desenha a página) --}}
        <style>
            .lg-carregar { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: #faf6f9; color: #7d6879; font: 13px "Segoe UI", system-ui, sans-serif; }
            .lg-carregar img { width: 64px; height: 64px; object-fit: contain; animation: lg-respirar 1.6s ease-in-out infinite; }
            .lg-carregar .lg-barra { position: relative; width: 150px; height: 3px; overflow: hidden; border-radius: 3px; background: #ecdfe9; }
            .lg-carregar .lg-barra::after { content: ""; position: absolute; inset: 0; width: 40%; border-radius: inherit; background: #6e2a63; animation: lg-deslizar 1.1s ease-in-out infinite; }
            #app:not(:empty) ~ .lg-carregar { display: none; }
            @media (prefers-color-scheme: dark) {
                .lg-carregar { background: #140a12; color: #b39cae; }
                .lg-carregar .lg-barra { background: #33212f; }
                .lg-carregar .lg-barra::after { background: #c86bb5; }
            }
            @keyframes lg-respirar { 50% { transform: scale(1.07); } }
            @keyframes lg-deslizar { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
        </style>
    </head>
    <body class="font-sans antialiased">
        @inertia
        <div class="lg-carregar" aria-hidden="true">
            <img src="/img/lemservices-marca.png" alt="">
            <div class="lg-barra"></div>
            <span>A carregar o LemGest…</span>
        </div>
    </body>
</html>
