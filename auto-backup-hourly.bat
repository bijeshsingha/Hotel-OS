@echo off
title Hotel OS - Continuous Hourly Backup
cd /d "%~dp0"

echo ===================================================
echo        Hotel OS - Continuous Hourly Backup Daemon
echo ===================================================
echo [INFO] Automatically creates an SQLite snapshot and JSON dump every hour.
echo Leave this window minimized. Close the window to stop.
echo ===================================================
echo.

:loop
echo [%date% %time%] Initiating automated backup...
call npx tsx scripts/db-backup.ts
echo [%date% %time%] Backup cycle completed. Next backup in 60 minutes...
echo ---------------------------------------------------
timeout /t 3600 /nobreak >nul
goto loop
