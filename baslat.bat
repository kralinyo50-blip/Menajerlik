@echo off
rem ============================================================
rem   MANAGER PRO 2026 - Otomatik Baslatici (tek dosya)
rem
rem   Bu dosya TEK BASINA yeterlidir. Ne yapar?
rem     1. Node.js var mi diye bakar, yoksa kurmayi teklif eder
rem     2. Node.js surumu yeterli mi diye bakar, gerekiyorsa kurar
rem     3. package.json'daki paketlerin hepsinin kurulu oldugunu dogrular
rem        Boylece eski kurulumdan kalan eksik paketler yuzunden olusan
rem        "Failed to resolve import" hatalari bir daha yasanmaz
rem     4. Eksik varsa npm install'i kendisi calistirir
rem     5. Bos portu bulur, sunucuyu baslatir, tarayiciyi otomatik acar
rem
rem   Kullanim:
rem     baslat.bat        : normal baslatma, gerekirse kurulum
rem     baslat.bat onar   : node_modules'u silip her seyi bastan kurar
rem
rem   Not: Bu dosyanin yaninda tools\check-deps.mjs veya check-deps.mjs
rem   varsa onu kullanir (daha ayrintili surum denetimi yapar).
rem ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "NEED=0"
set "PORT="
set "EKSIK="
set "DEPCHECK="
set "PAKLIST=three @types\three react react-dom clsx tailwind-merge vite typescript tailwindcss @tailwindcss\vite @types\node @types\react @types\react-dom @vitejs\plugin-react vite-plugin-singlefile"

echo.
echo ============================================
echo    MANAGER PRO 2026 - Ultimate Edition
echo ============================================
echo    Klasor: %CD%
echo.

if not exist "package.json" goto :paket_yok

rem ---------- Denetim betigini ara ----------
if exist "tools\check-deps.mjs" set "DEPCHECK=tools\check-deps.mjs"
if exist "check-deps.mjs" set "DEPCHECK=check-deps.mjs"

rem ---------- 1) Node.js var mi ----------
where node >nul 2>&1
if errorlevel 1 goto :node_yok
where npm >nul 2>&1
if errorlevel 1 goto :node_yok

rem ---------- 2) Node.js surumu yeterli mi ----------
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODEV=%%v"
set "NODENUM=!NODEV:v=!"
set "NODEMAJOR="
set "NODEMINOR="
for /f "tokens=1 delims=." %%a in ("!NODENUM!") do set "NODEMAJOR=%%a"
for /f "tokens=2 delims=." %%a in ("!NODENUM!") do set "NODEMINOR=%%a"
set "NODEOLD=0"
if defined NODEMAJOR if !NODEMAJOR! LSS 20 set "NODEOLD=1"
if defined NODEMAJOR if !NODEMAJOR! EQU 21 set "NODEOLD=1"
rem not: Node 21 desteklenmiyor, Vite 20.19 ve 22.12 uzerini ister
if defined NODEMAJOR if !NODEMAJOR! EQU 20 if defined NODEMINOR if !NODEMINOR! LSS 19 set "NODEOLD=1"
if defined NODEMAJOR if !NODEMAJOR! EQU 22 if defined NODEMINOR if !NODEMINOR! LSS 12 set "NODEOLD=1"
if "!NODEOLD!"=="1" goto :node_eski
echo    [OK] Node.js !NODEV!
echo.

rem ---------- 3) Onarim modu ----------
if /i "%~1"=="onar" (
  echo    [ONARIM] node_modules siliniyor, her sey bastan kurulacak...
  if exist "node_modules" rmdir /s /q "node_modules"
  echo.
)

rem ---------- 4) Bagimlilik denetimi ----------
if defined DEPCHECK goto :denetim_betik

echo    [..] Kurulu paketler kontrol ediliyor...
for %%D in (!PAKLIST!) do (
  if not exist "node_modules\%%D\package.json" set "EKSIK=!EKSIK! %%D"
)
if defined EKSIK (
  echo    [..] Kurulu olmayan paketler:!EKSIK!
  set "NEED=1"
  goto :kur
)

rem package.json son kontrolden sonra degisti mi? Yeni surumde paket eklenmis olabilir.
set "PKGHASH="
for /f "skip=1 delims=" %%H in ('certutil -hashfile "package.json" SHA1 2^>nul') do (
  if not defined PKGHASH (
    set "RAW=%%H"
    set "RAW=!RAW: =!"
    if defined RAW set "PKGHASH=!RAW!"
  )
)
if not defined PKGHASH goto :hazir
set "OLDHASH="
if exist "node_modules\.deps-ok.txt" set /p OLDHASH=<"node_modules\.deps-ok.txt"
if not defined OLDHASH set "NEED=1"
if defined OLDHASH if /i not "!PKGHASH!"=="!OLDHASH!" set "NEED=1"
if "!NEED!"=="1" goto :kur
goto :hazir

:denetim_betik
call node "!DEPCHECK!" "%CD%" >nul 2>&1
if errorlevel 10 goto :kur_listeli
if errorlevel 3 goto :node_eski
if errorlevel 1 goto :kur_listeli
goto :hazir

:kur_listeli
set "NEED=1"

:kur
echo.
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if defined DEPCHECK call node "!DEPCHECK!" "%CD%"
echo.
echo    [..] npm install calisiyor. Ilk seferde 1-3 dakika surebilir, bekle...
echo.
call npm.cmd install --no-fund
if errorlevel 1 goto :kurulum_hatasi
echo.
echo    [OK] npm install tamamlandi.

rem ---------- 5) Kurulum sonrasi dogrulama ----------
if defined DEPCHECK (
  call node "!DEPCHECK!" "%CD%" >nul 2>&1
  if errorlevel 1 goto :kurulum_eksik
  echo    [OK] Bagimliliklar hazir.
  goto :baslat
)

set "KALAN="
for %%D in (!PAKLIST!) do (
  if not exist "node_modules\%%D\package.json" set "KALAN=!KALAN! %%D"
)
if defined KALAN goto :kurulum_eksik

set "NEWHASH="
for /f "skip=1 delims=" %%H in ('certutil -hashfile "package.json" SHA1 2^>nul') do (
  if not defined NEWHASH (
    set "RAW=%%H"
    set "RAW=!RAW: =!"
    if defined RAW set "NEWHASH=!RAW!"
  )
)
if defined NEWHASH >"node_modules\.deps-ok.txt" echo !NEWHASH!
echo    [OK] Bagimliliklar hazir.
goto :baslat

:hazir
echo    [OK] Bagimliliklar tam.
goto :baslat

:kurulum_eksik
echo.
echo    [UYARI] Kurulum bitti ama hala eksik paket gorunuyor.
if defined DEPCHECK call node "!DEPCHECK!" "%CD%"
echo    Internet baglantisi veya proxy ayarlarini kontrol et.
echo.
choice /c EN /m "Yine de baslatilsin mi"
if errorlevel 2 goto :bitir

:baslat
echo.
echo    [..] Sunucu baslatiliyor...
goto :port_bul

rem ============================================================
rem   Sunucu bolumu
rem ============================================================
:port_bul
for %%P in (5173 5174 5175 5176 5177) do (
  if not defined PORT (
    netstat -ano | findstr /c:":%%P " >nul 2>&1 || set "PORT=%%P"
  )
)
if not defined PORT set "PORT=5180"

echo.
echo    Sunucu adresi : http://localhost:!PORT!
echo    Durdurmak icin: bu pencerede Ctrl+C
echo    Tarayici kendiliginden acilmazsa adresi elle yaz.
echo ============================================
echo.

where powershell >nul 2>&1
if errorlevel 1 goto :sunucu_calistir
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$p=!PORT!; for($i=0;$i -lt 120;$i++){ try{ $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',$p); $c.Close(); Start-Process ('http://localhost:'+$p); break } catch { Start-Sleep -Milliseconds 700 } }"

:sunucu_calistir
call npm.cmd run dev -- --host 127.0.0.1 --port !PORT!

echo.
echo    Sunucu durdu.
goto :bitir

rem ============================================================
rem   Hata bolumleri
rem ============================================================

:kurulum_hatasi
echo.
echo ============================================
echo    HATA: npm install basarisiz oldu
echo ============================================
echo.
echo    Olasi sebepler ve cozumler:
echo      1. Internet baglantisi yok
echo         Baglantiyi kontrol edip tekrar dene.
echo      2. Kurumsal proxy gerekiyor
echo         npm config set proxy http://kullanici:sifre@proxyadresi:port
echo      3. Yetki sorunu
echo         Bu dosyaya sag tik yapip Yonetici olarak calistir.
echo      4. Yarim kalmis bozuk kurulum
echo         baslat.bat onar komutunu dene.
echo.
choice /c EN /m "Kurulumu tekrar denemek ister misin"
if errorlevel 2 goto :bitir
echo.
echo    [..] Tekrar deneniyor...
call npm.cmd install --no-fund
if errorlevel 1 goto :kurulum_hatasi
echo.
echo    [OK] Kurulum tamam.
goto :baslat

:paket_yok
echo    HATA: package.json bulunamadi.
echo.
echo    Indirdigin arsivde sadece src klasoru degil, package.json ve
echo    package-lock.json dosyalari da bulunmalidir. Menajerlik klasorunun
echo    tamamini indirip bu dosyayi onun icine koy.
echo.
goto :bitir

:node_eski
echo    HATA: Node.js surumu cok eski: !NODEV!
echo.
echo    Oyunun kullandigi Vite icin en az Node.js 20.19 veya 22.12 gerekir.
echo.
choice /c EN /m "Guncel Node.js LTS simdi kurulsun mu"
if errorlevel 2 goto :node_elle
where winget >nul 2>&1
if errorlevel 1 goto :node_elle
echo.
echo    [..] winget ile Node.js LTS kuruluyor...
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto :node_elle
echo.
echo    [OK] Guncel Node.js kuruldu.
echo    Bu pencereyi kapatip baslat.bat dosyasini tekrar calistir.
echo.
goto :bitir

:node_yok
echo    HATA: Node.js bulunamadi veya PATH'te degil.
echo.
echo    Node.js olmadan oyun calismaz. LTS surumu gerekir.
echo.
choice /c EN /m "Node.js simdi otomatik kurulsun mu"
if errorlevel 2 goto :node_elle
where winget >nul 2>&1
if errorlevel 1 goto :node_elle
echo.
echo    [..] winget ile Node.js LTS kuruluyor...
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto :node_elle
echo.
echo    [OK] Node.js kuruldu.
echo    Bu pencereyi kapatip baslat.bat dosyasini tekrar calistir.
echo.
goto :bitir

:node_elle
echo.
echo    Elle kurulum:
echo      1. https://nodejs.org adresini ac
echo      2. LTS surumunu indir ve kur
echo      3. Kurulumda "Add to PATH" secenegi isaretli olsun
echo      4. Bilgisayari yeniden baslat
echo      5. baslat.bat dosyasini tekrar calistir
echo.
start "" https://nodejs.org/tr/download
goto :bitir

:bitir
echo.
echo Kapatmak icin bir tusa bas...
pause >nul
endlocal
exit /b