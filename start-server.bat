@echo off
title Hotel OS Server
cd /d "%~dp0"

echo ===================================================
echo               Starting Hotel OS Server
echo ===================================================
echo.

echo [INFO] Launching Hotel OS server on Port 3001 (0.0.0.0)...
echo [INFO] Local:   http://localhost:3001
echo [INFO] Network: http://192.168.0.9:3001 or http://192.168.0.12:3001
echo Press Ctrl+C in this window to stop.
echo ===================================================
echo.

npm run dev
