@echo off
setlocal enabledelayedexpansion
title Hotel OS - Git Auto Pull ^& Update
cd /d "%~dp0"

echo ===================================================
echo             Hotel OS - Auto Pull ^& Update
echo ===================================================
echo.

:: 1. Check Git Installation
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git from https://git-scm.com/
    echo.
    pause
    exit /b 1
)

:: 2. Check Git Repository
if not exist ".git" (
    echo [ERROR] This directory is not a Git repository.
    echo Please make sure this file is placed in your Hotel OS folder.
    echo.
    pause
    exit /b 1
)

:: 3. Fetch and Pull from GitHub
echo [1/4] Checking connection to GitHub repository...
git fetch origin main
if %errorlevel% neq 0 (
    echo [WARNING] Could not connect to remote repository. Check your internet connection.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] Pulling latest changes from origin/main...
echo ---------------------------------------------------
git pull origin main
echo ---------------------------------------------------
echo.

:: 4. Check if Prisma or Packages changed and sync
echo [3/4] Checking Prisma Schema ^& Dependencies...
if exist "node_modules" (
    call npx prisma generate >nul 2>nul
    echo [OK] Prisma client synchronized.
) else (
    echo [INFO] Installing required node modules...
    call npm install
    call npx prisma generate
)

:: 5. Summary & Completion
echo.
echo [4/4] Hotel OS is now up to date with GitHub!
echo ===================================================
echo [SUCCESS] Latest code pulled successfully.
echo.
echo You can now run 'start-server.bat' to launch the app,
echo or visit http://localhost:3000 in your browser.
echo ===================================================
echo.

pause
