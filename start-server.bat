@echo off
title Hotel OS Server
cd /d "%~dp0"

echo ===================================================
echo               Starting Hotel OS Server
echo ===================================================
echo.

echo [INFO] Launching Hotel OS server (0.0.0.0)...
echo [INFO] Next.js will auto-bind to port 3000 (or next free port if 3000 is occupied).
echo Press Ctrl+C in this window to stop.
echo ===================================================
echo.

npm run dev
