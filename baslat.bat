@echo off
chcp 65001 >nul
title Manager Pro 2026 - Localhost
color 0A

echo.
echo  ============================================
echo    MANAGER PRO 2026 - Ultimate Edition
echo  ============================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo  [HATA] Node.js bulunamadi!
    echo  Lutfen https://nodejs.org adresinden Node.js kurun.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js bulundu:
node -v
echo.

if not exist "node_modules\" (
    echo  [..] Bagimliliklar yukleniyor (npm install)...
    call npm install
    if errorlevel 1 (
        echo  [HATA] npm install basarisiz!
        pause
        exit /b 1
    )
    echo  [OK] Bagimliliklar yuklendi.
    echo.
)

echo  [..] Gelistirme sunucusu baslatiliyor...
echo  [..] Tarayicinizda http://localhost:5173 acilacak
echo.
echo  Durdurmak icin bu pencerede Ctrl+C basin.
echo  ============================================
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

call npm run dev -- --host 0.0.0.0 --port 5173

pause
