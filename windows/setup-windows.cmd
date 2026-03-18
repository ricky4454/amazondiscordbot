@echo off
setlocal
cd /d "%~dp0.."

echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)

echo [2/4] Checking .env...
if not exist .env (
  copy /Y .env.example .env >nul
  echo Created .env from .env.example
  echo Please fill in DISCORD_TOKEN and DISCORD_CHANNEL_ID in Notepad.
  notepad .env
) else (
  echo .env already exists.
)

echo [3/4] Installing dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo [4/4] Running doctor check...
call npm run doctor
if errorlevel 1 (
  echo Doctor check failed. Fix the error above and run setup again.
  pause
  exit /b 1
)

echo Setup complete. You can now run start-windows.cmd
pause
