@echo off
chcp 65001 >nul
title LemGest - preparar copia para outro computador
REM Exporta as bases de dados e cria LemGest-copia-AAAA-MM-DD.zip ao lado da pasta do projecto.
REM O MySQL do XAMPP tem de estar ligado.
cd /d "%~dp0.."
C:\xampp\php\php.exe "%~dp0exportar.php"
echo.
pause
