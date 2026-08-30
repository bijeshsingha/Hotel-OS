@echo off
title Hotel OS Server
cd /d "%~dp0"

echo ===================================================
echo               Starting Hotel OS Server
echo ===================================================
echo.

echo [INFO] Local URL:       http://localhost:3000
echo [INFO] Admin Portal:    http://localhost:3000/admin
echo.
echo [INFO] Launching server on port 3000 (0.0.0.0)...
echo Press Ctrl+C in this window or run stop-server.bat to stop.
echo ===================================================
echo.

npm run dev
