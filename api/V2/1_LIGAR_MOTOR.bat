@echo off
setlocal
cd /d "%~dp0"

if exist ".env" (
    for /f "tokens=*" %%a in (.env) do set %%a
)

rem Check if variable is still empty or just spaces
if "%BETBURGER_ACCESS_TOKEN%"=="" goto ask_token
goto start_scraper

:ask_token
set /p BETBURGER_ACCESS_TOKEN="Cole seu Token da BetBurger aqui e aperte Enter: "
set "TMPENV=.env.tmp"
break> "%TMPENV%"
if exist ".env" (
    for /f "usebackq delims=" %%L in (".env") do (
        echo %%L | findstr /b /c:"BETBURGER_ACCESS_TOKEN=" >nul || echo %%L>>"%TMPENV%"
    )
)
echo BETBURGER_ACCESS_TOKEN=%BETBURGER_ACCESS_TOKEN%>>"%TMPENV%"
move /y "%TMPENV%" ".env" >nul

:start_scraper
echo Iniciando Scraper com Token: %BETBURGER_ACCESS_TOKEN:~0,10%...
if not defined DISABLE_HOUSES_FILTER set DISABLE_HOUSES_FILTER=0
if not defined USE_BOOKMAKER_FAMILY_EXPANSION set USE_BOOKMAKER_FAMILY_EXPANSION=1
python betburger_scraper.py --deep-dive --per-page 100 --max-pages 999 --min-percent 0
pause
