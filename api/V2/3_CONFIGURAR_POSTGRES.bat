@echo off
setlocal
cd /d "%~dp0"

set "PSQL=C:\Program Files\PostgreSQL\18\bin\psql.exe"
if not exist "%PSQL%" set "PSQL=psql"

echo ==========================================
echo Configurador PostgreSQL - Surebet (Local)
echo ==========================================

set /p PGHOST=Host [127.0.0.1]: 
if "%PGHOST%"=="" set "PGHOST=127.0.0.1"

set /p PGPORT=Porta [5432]: 
if "%PGPORT%"=="" set "PGPORT=5432"

set /p PGSUPER=Usuario admin [postgres]: 
if "%PGSUPER%"=="" set "PGSUPER=postgres"

set /p PGSUPERPASS=Senha do usuario %PGSUPER%: 

set /p PGDB=Banco app [surebet]: 
if "%PGDB%"=="" set "PGDB=surebet"

set /p PGAPPUSER=Usuario app [surebet_app]: 
if "%PGAPPUSER%"=="" set "PGAPPUSER=surebet_app"

set /p PGAPPPASS=Senha usuario app: 
if "%PGAPPPASS%"=="" (
  echo [ERRO] Senha do usuario app nao pode ficar vazia.
  pause
  exit /b 1
)

set "PGPASSWORD=%PGSUPERPASS%"

echo.
echo [1/4] Testando conexao...
"%PSQL%" -w -h "%PGHOST%" -p "%PGPORT%" -U "%PGSUPER%" -d postgres -c "SELECT 1;" >nul
if errorlevel 1 (
  echo [ERRO] Falha ao conectar no PostgreSQL com usuario %PGSUPER%.
  echo Verifique host/porta/usuario/senha.
  pause
  exit /b 1
)

echo [2/4] Criando banco (se nao existir)...
set "DB_EXISTS="
set "_DB_CHECK_FILE=%TEMP%\surebet_db_exists_%RANDOM%%RANDOM%.txt"
"%PSQL%" -w -h "%PGHOST%" -p "%PGPORT%" -U "%PGSUPER%" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname=''%PGDB%''" > "%_DB_CHECK_FILE%" 2>nul
if exist "%_DB_CHECK_FILE%" (
  set /p DB_EXISTS=<"%_DB_CHECK_FILE%"
  del /q "%_DB_CHECK_FILE%" >nul 2>nul
)
if not "%DB_EXISTS%"=="1" (
  "%PSQL%" -w -h "%PGHOST%" -p "%PGPORT%" -U "%PGSUPER%" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE %PGDB%;"
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel criar o banco %PGDB%.
    pause
    exit /b 1
  )
)

echo [3/4] Criando/atualizando usuario app...
"%PSQL%" -w -h "%PGHOST%" -p "%PGPORT%" -U "%PGSUPER%" -d postgres -v ON_ERROR_STOP=1 -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '%PGAPPUSER%') THEN CREATE ROLE %PGAPPUSER% LOGIN PASSWORD '%PGAPPPASS%'; ELSE ALTER ROLE %PGAPPUSER% LOGIN PASSWORD '%PGAPPPASS%'; END IF; END $$;"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel criar/alterar usuario %PGAPPUSER%.
  pause
  exit /b 1
)

echo [4/4] Concedendo permissoes no banco %PGDB%...
"%PSQL%" -w -h "%PGHOST%" -p "%PGPORT%" -U "%PGSUPER%" -d "%PGDB%" -v ON_ERROR_STOP=1 -c "GRANT CONNECT ON DATABASE %PGDB% TO %PGAPPUSER%; GRANT USAGE, CREATE ON SCHEMA public TO %PGAPPUSER%; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO %PGAPPUSER%; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO %PGAPPUSER%; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO %PGAPPUSER%; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO %PGAPPUSER%;"
if errorlevel 1 (
  echo [ERRO] Falha ao aplicar permissoes no banco.
  pause
  exit /b 1
)

set "TMPENV=.env.tmp"
break> "%TMPENV%"
if exist ".env" (
  for /f "usebackq delims=" %%L in (".env") do (
    echo %%L | findstr /b /c:"PG_ENABLED=" /c:"PG_HOST=" /c:"PG_PORT=" /c:"PG_DB=" /c:"PG_USER=" /c:"PG_PASSWORD=" /c:"PG_SSLMODE=" /c:"PG_RETENTION_DAYS=" >nul || echo %%L>>"%TMPENV%"
  )
)
echo PG_ENABLED=1>>"%TMPENV%"
echo PG_HOST=%PGHOST%>>"%TMPENV%"
echo PG_PORT=%PGPORT%>>"%TMPENV%"
echo PG_DB=%PGDB%>>"%TMPENV%"
echo PG_USER=%PGAPPUSER%>>"%TMPENV%"
echo PG_PASSWORD=%PGAPPPASS%>>"%TMPENV%"
echo PG_SSLMODE=prefer>>"%TMPENV%"
echo PG_RETENTION_DAYS=365>>"%TMPENV%"
move /y "%TMPENV%" ".env" >nul

echo.
echo OK. PostgreSQL configurado e .env atualizado.
echo Agora rode:
echo   1_LIGAR_MOTOR.bat
echo   2_LIGAR_ANTENA.bat
pause
