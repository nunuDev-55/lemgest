<!DOCTYPE html>
<html lang="pt">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Página base do site, do catálogo e da área do cliente: sem a lista das rotas internas (@routes) e sem scripts embutidos --}}
        <title inertia>LemServ · Lounge e Outdoor</title>
        <meta name="description" content="LemServ: aluguer de mobiliário lounge, tendas e decoração para eventos em Maputo e Matola.">
        <meta property="og:site_name" content="LemServ">
        <meta property="og:title" content="LemServ · Lounge e Outdoor">
        <meta property="og:description" content="Aluguer de mobiliário lounge, tendas e decoração para eventos em Maputo e Matola.">
        <meta property="og:image" content="{{ url('/img/lemservices-logo.png') }}">
        <meta property="og:type" content="website">

        <meta name="theme-color" content="#6e2a63">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead

        <style>
            .lg-carregar { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: #fff; }
            .lg-carregar img { width: 56px; height: 56px; object-fit: contain; opacity: .85; }
            #app:not(:empty) ~ .lg-carregar { display: none; }
            @media (prefers-color-scheme: dark) { .lg-carregar { background: #0a0a0a; } }
        </style>
    </head>
    <body class="font-sans antialiased">
        @inertia
        <div class="lg-carregar" aria-hidden="true">
            <img src="/img/lemservices-marca.png" alt="">
        </div>
    </body>
</html>
