@echo off
chcp 65001 >nul 2>&1
title VocaCal - Quick Start
echo.
echo  ======================================
echo   VocaCal Quick Start (Real Device)
echo  ======================================
echo.

set ROOT=%~dp0

:: ---- Step 1: Check ADB device ----
echo  [1/5] Checking device connection...
adb devices 2>nul | findstr /R "device$" >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] No device found!
    echo  Please check:
    echo    - USB cable is connected
    echo    - USB debugging is enabled
    echo    - Tap "Allow" on phone popup
    echo.
    pause
    exit /b 1
)
echo         OK - Device connected
echo.

:: ---- Step 2: Port forwarding ----
echo  [2/5] Setting up port forwarding...
adb reverse tcp:8081 tcp:8081 >nul 2>&1
adb reverse tcp:8000 tcp:8000 >nul 2>&1
echo         OK - Ports forwarded (8081 + 8000)
echo.

:: ---- Step 3: Kill ALL old processes on 8000/8081 ----
echo  [3/5] Cleaning old processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8081.*LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo         OK - Ports 8000 + 8081 cleared
echo.

:: ---- Step 4: Start backend ----
echo  [4/5] Starting backend (port 8000)...
start "VocaCal-Backend" cmd /c "cd /d %ROOT%server && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo         OK - Backend started
echo.

:: ---- Step 5: Start Metro + Install App ----
echo  [5/5] Starting Metro + Installing App...
echo         This may take 1-2 minutes...
echo.
cd /d %ROOT%app

:: Start Metro in a separate window
start "VocaCal-Metro" cmd /c "npx react-native start --port 8081"
timeout /t 8 /nobreak >nul

:: Install app WITHOUT starting another Metro (--no-packager)
call npx react-native run-android --port 8081 --no-packager

echo.
echo  ======================================
echo   All Done!
echo   Backend: http://192.168.1.36:8000
echo   Metro:   http://localhost:8081
echo  ======================================
echo.
echo  Press any key to exit (servers keep running)
pause >nul
