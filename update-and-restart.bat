@echo off
setlocal enabledelayedexpansion
title Hotel OS - Update ^& Restart
cd /d "%~dp0"

echo ===================================================
echo             Hotel OS - Update ^& Restart
echo ===================================================
echo.

:: 1. Pull Latest Code
echo [1/3] Pulling latest code changes from GitHub...
call git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git pull failed. Please check internet connection or Git status.
    pause
    exit /b 1
)

:: 2. Regenerate Prisma Client
echo.
echo [2/3] Synchronizing Prisma Client...
call npx prisma generate >nul 2>nul

:: 3. Restart Server
echo.
echo [3/3] Restarting Hotel OS server...
if exist "stop-server.bat" (
    call stop-server.bat >nul 2>nul
)

echo [INFO] Starting server on http://localhost:3000 ...
start "Hotel OS Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo.
echo ===================================================
echo [SUCCESS] Hotel OS updated and server restarted!
echo ===================================================
timeout /t 5
