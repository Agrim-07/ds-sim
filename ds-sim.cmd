@echo off
rem Starts ds-sim on Windows. Double-click this file or run "ds-sim" in a terminal.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ds-sim needs Node.js 20 or newer. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

node scripts\start.js %*
if errorlevel 1 pause
endlocal
