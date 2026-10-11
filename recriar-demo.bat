@echo off
REM Recria o ambiente de DEMONSTRACAO (base de dados lemgest_demo, http://127.0.0.1:8089).
REM Nao toca na base de dados real (lemgest).
cd /d %~dp0
set DB_DATABASE=lemgest_demo
C:\xampp\php\php.exe artisan migrate:fresh --force
C:\xampp\php\php.exe artisan db:seed --class=DemoSeeder --force
pause
