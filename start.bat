@echo off
if "%1"=="" (
    start "" cmd /c "%~f0" launched
    exit
)


echo Checking for updates...

:: Check if the current directory is a Git repository
git -C "%~dp0" rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
  echo This is not a Git repository. Ignoring pull operation.
) else (
  :: Pull the latest updates from the repository
  git -C "%~dp0" pull origin main >nul 2>&1
  if %errorlevel% neq 0 (
    echo Failed to pull the latest updates from the repository.
  ) else (
    echo Updated successfully.
  )
)


echo Starting Chrome with remote debugging...

:: Check if Chrome is already running
tasklist /FI "IMAGENAME eq chrome.exe" 2>nul | find /I "chrome.exe" >nul
if %errorlevel%==0 (
  echo Chrome is already running. Reusing existing instance.
) else (
  echo Starting Chrome...
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --window-size=1920,1080 --mute-audio
)

echo Launching pm2 monit in a new window...
start "" pm2 monit

echo Compiling TypeScript...
set "folderName=dist"
rmdir /S /Q "%~dp0%folderName%"

cmd /k "tsc -p tsconfig.json & exit"

:: Wait for dist/index.js
echo Waiting for dist/index.js to be created...
:checkfile
if exist "dist/index.js" (
  echo dist/index.js found. Proceeding to start the application...
) else (
  timeout /t 1 /nobreak >nul
  goto checkfile
)

set NODE_ENV=production
set PM2_LOG_COLOR=true
set PW_TEST_SCREENSHOT_NO_FONTS_READY=1
echo Restarting/Starting PM2 process...
pm2 restart BM37 --silent || pm2 start dist/index.js --name BM37 --silent

echo closing main cmd...