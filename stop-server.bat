@echo off
title Stop Hotel OS Server
cd /d "%~dp0"

echo ===================================================
echo               Stopping Hotel OS Server
echo ===================================================
echo.

echo [INFO] Finding processes using port 3000...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    set FOUND=1
    echo [INFO] Terminating PID %%a listening on port 3000...
    taskkill /F /PID %%a >nul 2>&1
)

:: Ensure any other socket holding processes on 3000 are terminated
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

if %FOUND%==1 (
    echo [SUCCESS] Hotel OS Server has been stopped successfully.
) else (
    echo [INFO] No active server found on port 3000.
)

echo.
echo ===================================================
timeout /t 3 >nul
