@echo off
REM ============================================================
REM AANM Project - Run Frontend + Backend Development Servers
REM ============================================================

echo.
echo Starting AANM Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start a project-local PostgreSQL instance when DATABASE_URL is not set.
if not defined DATABASE_URL (
    echo.
    echo Preparing local PostgreSQL database...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev-postgres.ps1"
    if errorlevel 1 (
        echo.
        echo [ERROR] Could not prepare the local PostgreSQL database.
        echo Set DATABASE_URL manually, or install PostgreSQL 17 and try again.
        pause
        exit /b 1
    )

    set "DATABASE_URL=postgres://postgres@127.0.0.1:55432/aanm"
    set "DATABASE_SSL=false"
)

echo.
echo Starting development servers...
echo.
echo   Frontend (Vite):   http://localhost:5173
echo   Backend (Express): http://localhost:3001
echo   Database:          PostgreSQL via DATABASE_URL
echo.
echo Press Ctrl+C to stop all servers.
echo.

REM Run both dev servers concurrently
call npm run full-dev

pause
