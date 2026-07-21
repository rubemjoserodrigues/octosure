@echo off
set "APP_DIR=c:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING\JA EXISTIA\electron-scrapper-main\electron-scrapper-main"
set LOG_FILE="%~dp0electron_crash.log"

echo [START] %DATE% %TIME% > %LOG_FILE%
cd /d "%APP_DIR%"

echo [INFO] Environment: >> %LOG_FILE%
set >> %LOG_FILE%

echo [INFO] Setting SOCKET_URL=https://octosure.net >> %LOG_FILE%
set SOCKET_URL=https://octosure.net
set SOCKET_SECRET=changeme

echo [INFO] Running 'npm start --verbose'... >> %LOG_FILE%
cmd /c "npm start --verbose" >> %LOG_FILE% 2>&1

echo [END] Exit Code: %errorlevel% >> %LOG_FILE%
pause


