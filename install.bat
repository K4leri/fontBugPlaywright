@echo off
setlocal enabledelayedexpansion

:: Verify Node.js and npm exist
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install it manually first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo npm is not working properly. Please fix Node.js installation.
    pause
    exit /b 1
)



:: Install project dependencies
echo Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo An error occurred during npm install
    pause
    exit /b 1
)

:: Install TypeScript globally
echo Installing TypeScript...
call npm install -g typescript
if %errorlevel% neq 0 (
    echo Failed to install TypeScript globally
    echo Try running as Administrator
    pause
    exit /b 1
)

:: Install pm2 globally
echo Installing pm2...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo Failed to install pm2 globally
    echo Try running as Administrator
    pause
    exit /b 1
)

cls
echo --------------------------------------------------
echo Installation complete!
echo You can start the application with:
echo start.bat
echo --------------------------------------------------

:: Keep window open even if everything succeeds
pause