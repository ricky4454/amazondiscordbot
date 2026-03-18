@echo off
setlocal
cd /d "%~dp0.."

title Amazon Discord Restock Bot

echo Starting Amazon Discord Restock Bot...
if not exist .env (
  echo .env file was not found. Run windows\setup-windows.cmd first.
  pause
  exit /b 1
)

call npm start
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Bot exited with error code %EXIT_CODE%.
) else (
  echo Bot exited normally.
)
pause
exit /b %EXIT_CODE%
