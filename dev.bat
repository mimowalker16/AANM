@echo off
REM ============================================================
REM AANM Project - Run Frontend + Backend Development Servers
REM ============================================================

echo.
echo 🚀 Starting AANM Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo ✅ Starting development servers...
echo.
echo   Frontend (Vite):  http://localhost:5173
echo   Backend (Express): http://localhost:3001
echo.
echo Press Ctrl+C to stop all servers.
echo.

REM Run both dev servers concurrently
call npm run full-dev

pause
