@echo off
title Controle Financeiro - Matriz Semanal
chcp 65001 > nul
cd /d "%~dp0"

echo ====================================================
echo   Iniciando Controle Financeiro - Matriz Semanal
echo ====================================================
echo.

REM Verifica se as dependencias estao instaladas
if not exist "node_modules" (
    echo [!] Pasta node_modules nao encontrada. Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [X] Erro ao instalar dependencias do projeto.
        pause
        exit /b 1
    )
    echo.
)

REM Abre a aplicacao no navegador padrao
echo [+] Abrindo no navegador em http://localhost:9900 ...
ping 127.0.0.1 -n 3 > nul
start http://localhost:9900

echo [+] Iniciando servidor Node.js...
echo ====================================================
echo.

call npm start

pause
