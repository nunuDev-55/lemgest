@echo off
chcp 65001 >nul
title LemGest - endereco para o telemovel
REM Mostra o endereco para abrir o LemGest no telemovel (iPhone/Android) ligado ao mesmo Wi-Fi.
REM O endereco muda se o router der outro IP a este computador: corra este ficheiro sempre que precisar.
echo.
echo    Abra no Safari do iPhone (o telemovel tem de estar no mesmo Wi-Fi):
echo.
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|WLAN|Ethernet' -and $_.IPAddress -notmatch '^(127\.|169\.254\.|192\.168\.56\.)' } | ForEach-Object { '      Sistema real:   http://' + $_.IPAddress + ':8088'; '      Demonstracao:   http://' + $_.IPAddress + ':8089'; '' }"
echo    Para ficar como aplicacao: no Safari toque em Partilhar e depois "Adicionar ao ecra principal".
echo.
pause
