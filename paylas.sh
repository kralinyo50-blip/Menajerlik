#!/usr/bin/env bash
# Manager Pro 2026 - İnternet paylaşımı (farklı Wi-Fi'lar)
# Çalıştır: ./paylas.sh
# Bilgisayarını ücretsiz güvenli tünelle internete açar, arkadaşlarına
# göndereceğin linki ekrana yazar. Hesap/port ayarı gerekmez.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "  [HATA] Node.js bulunamadı! Önce ./start.sh ile kurulum yap"
  echo "  ya da https://nodejs.org adresinden Node.js LTS kur."
  exit 1
fi

exec node tools/share-online.mjs "$@"
