#!/usr/bin/env bash
set -euo pipefail

# frontend/scripts/deploy-pages.sh — build dist/ lalu salin ke repo porto
# (PRD wajib #4). BE/infra TIDAK ikut ke-push — cuma dist statis.
#
# Pemakaian:
#   PORTO_DIR="/path/ke/public_html/jobtracker" ./scripts/deploy-pages.sh

: "${PORTO_DIR:?PORTO_DIR belum diisi — folder jobtracker di repo porto (public_html/jobtracker)}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# base /jobtracker/ + URL funnel sudah dibaca dari .env.production
npm run build

if [ ! -f dist/index.html ]; then
  echo "GAGAL: dist/index.html tidak jadi." >&2
  exit 1
fi

rm -rf "$PORTO_DIR/assets"
mkdir -p "$PORTO_DIR"
cp dist/index.html "$PORTO_DIR/index.html"
cp -R dist/assets "$PORTO_DIR/assets"
touch "$PORTO_DIR/.nojekyll"

echo "OK: dist/ tersalin ke $PORTO_DIR"
echo "Tinggal commit + push di repo porto (push dari SINI tidak membawa BE)."
