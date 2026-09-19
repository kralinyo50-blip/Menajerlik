#!/usr/bin/env bash
# Manager Pro 2026 - Localhost starter
set -e
cd "$(dirname "$0")"

echo ""
echo "  ============================================"
echo "    MANAGER PRO 2026 - Ultimate Edition"
echo "  ============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  [HATA] Node.js bulunamadı!"
  echo "  Lütfen https://nodejs.org adresinden Node.js kurun."
  exit 1
fi

echo "  [OK] Node.js: $(node -v)"

if [ ! -d "node_modules" ]; then
  echo "  [..] Bağımlılıklar yükleniyor (npm install)..."
  npm install
  echo "  [OK] Bağımlılıklar yüklendi."
fi

echo "  [..] Geliştirme sunucusu başlatılıyor..."
echo "  [..] Bu bilgisayar: http://localhost:5173"
echo "  [..] Aynı Wi-Fi'deki arkadaşların için:"
hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | while read -r ip; do
  echo "       http://$ip:5173"
done
echo "  (Arkadaşların bu adreslerden birini açmalı; herkes kendi"
echo "   bilgisayarında sunucu çalıştırırsa kodlar birbirinde görünmez.)"
echo "  Durdurmak için Ctrl+C"
echo "  ============================================"
echo ""

npm run dev -- --host 0.0.0.0 --port 5173
