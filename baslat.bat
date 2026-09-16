@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo   MANAGER PRO 2026
echo ============================================
echo.
echo Klasor: %CD%
echo.

if not exist "package.json" (
  echo HATA: package.json bulunamadi.
  echo Bu dosyayi Menajerlik klasorune koy.
  echo.
  goto :bitir
)

where node >nul 2>&1
if errorlevel 1 goto :node_yok

echo Node surumu:
node -v
echo.

if not exist "node_modules" (
  echo npm install calisiyor, bekle...
  echo.
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo HATA: npm install basarisiz.
    goto :bitir
  )
  echo.
  echo npm install tamam.
  echo.
)

echo Sunucu aciliyor: http://localhost:5173
echo Durdurmak icin Ctrl+C bas.
echo ============================================
echo.

start http://localhost:5173

call npm.cmd run dev -- --host 127.0.0.1 --port 5173

echo.
echo Sunucu durdu.
goto :bitir

:node_yok
echo HATA: Node.js yok veya PATH'te degil.
echo.
echo 1. https://nodejs.org adresinden LTS kur
echo 2. "Add to PATH" secili olsun
echo 3. Bilgisayari yeniden baslat
echo 4. Bu bat dosyasini tekrar ac
echo.
goto :bitir

:bitir
echo.
echo Kapatmak icin bir tusa bas...
pause >nul
endlocal