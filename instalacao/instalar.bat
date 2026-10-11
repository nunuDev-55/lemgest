@echo off
chcp 65001 >nul
title LemGest - instalar neste computador
REM Instala o LemGest a partir da copia feita com exportar.bat. Ver instalacao\LEIA-ME.md.
REM Antes de correr: XAMPP (PHP 8.2) instalado em C:\xampp e o MySQL ligado no XAMPP Control Panel.
if not exist C:\xampp\php\php.exe (
    echo.
    echo    Nao encontrei o XAMPP em C:\xampp. Instale o XAMPP com PHP 8.2 nessa pasta e volte a correr.
    echo.
    pause
    exit /b 1
)
cd /d "%~dp0.."
C:\xampp\php\php.exe "%~dp0instalar.php"
echo.
pause
