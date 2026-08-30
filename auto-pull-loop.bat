@echo off
title Hotel OS - Continuous Auto Pull
cd /d "%~dp0"

echo ===================================================
echo     Hotel OS - Continuous Background Auto Pull
echo ===================================================
echo [INFO] This script checks for GitHub updates every 5 minutes.
echo Leave this window minimized. Close the window to stop.
echo ===================================================
echo.

:loop
echo [%date% %time%] Checking for updates from origin/main...
git pull origin main
if %errorlevel% equ 0 (
    call npx prisma generate >nul 2>nul
)
echo [%date% %time%] Sync check done. Next check in 5 minutes...
echo ---------------------------------------------------
timeout /t 300 /nobreak >nul
goto loop
