@echo off
rem ============================================================
rem   MANAGER PRO 2026 - Internet Paylasimi (farkli Wi-Fi'lar)
rem
rem   Bu dosyaya cift tikla:
rem     1. Oyunu baslatir
rem     2. Bilgisayarini ucretsiz guvenli tunelle internete acar
rem        (hesap yok, port ayari yok, IP aramak yok)
rem     3. Arkadaslarina gonderecegin linki ekrana yazar
rem
rem   Herkes (sen dahil) o linki acsin, Online Oyna desin, kodla
rem   ayni lige girsin. Bu pencere kapali kalmali; kapatirsan
rem   oyun herkese kapanir. Link her baslatista degisir.
rem ============================================================
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [HATA] Node.js bulunamadi! Once baslat.bat ile kurulum yap
  echo   ya da https://nodejs.org adresinden Node.js LTS kur.
  echo.
  pause
  exit /b 1
)

node tools\share-online.mjs %*

echo.
echo   Paylasim durdu. Kapatmak icin bir tusa bas...
pause >nul
endlocal
