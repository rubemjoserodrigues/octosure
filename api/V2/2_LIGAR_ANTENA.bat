@echo off
setlocal
cd /d "%~dp0"
if exist ".env" (
    for /f "tokens=*" %%a in (.env) do set %%a
)
echo Iniciando Servidor Socket.IO (Porta 3000)...
if not defined DISABLE_HOUSES_FILTER set DISABLE_HOUSES_FILTER=0
if not defined USE_BOOKMAKER_FAMILY_EXPANSION set USE_BOOKMAKER_FAMILY_EXPANSION=1
python server.py
pause
