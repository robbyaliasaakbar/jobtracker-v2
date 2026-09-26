#!/usr/bin/env bash
set -euo pipefail

# scripts/start.sh — nyalakan stack JobTracker v2 (PRD wajib #7).
# Yang dinyalakan CUMA backend-api :7012 + caddy :7014.
# Auth :7002, Postgres :5432, dan service lain TIDAK disentuh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="$ROOT/infra/docker-compose.stack.yml"

if [ ! -f "$ROOT/backend-api/.env" ]; then
  cp "$ROOT/backend-api/.env.example" "$ROOT/backend-api/.env"
  echo "backend-api/.env belum ada — dibuat dari .env.example. Cek isinya."
fi

echo ">> docker compose up -d --build"
docker compose -f "$COMPOSE" up -d --build

echo ">> menunggu backend-api sehat (maks 60 detik)..."
sehat=""
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:7012/health || true)" = "200" ]; then
    sehat="ya"
    break
  fi
  sleep 2
done

gagal=0
cek() {
  local nama="$1" url="$2" harapan="$3"
  local kode
  kode="$(curl -s -o /dev/null -w '%{http_code}' "$url" || echo 000)"
  if [ "$kode" = "$harapan" ]; then
    printf '  %-28s %s OK\n' "$nama" "$kode"
  else
    printf '  %-28s %s (harapannya %s) GAGAL\n' "$nama" "$kode" "$harapan"
    gagal=1
  fi
}

echo ">> verifikasi:"
if [ -z "$sehat" ]; then
  echo "  backend-api tidak sehat dalam 60 detik. Log:"
  docker compose -f "$COMPOSE" logs --tail 30 backend-api
  exit 1
fi
cek "BE /health"        "http://127.0.0.1:7012/health"        "200"
cek "Caddy /health"     "http://127.0.0.1:7014/health"        "200"
cek "Caddy -> BE"       "http://127.0.0.1:7014/api/health"    "200"
cek "Caddy -> auth"     "http://127.0.0.1:7014/auth/api/me"   "401" # 401 = proxy nyambung ke :7002

if [ "$gagal" -ne 0 ]; then
  echo ">> ADA YANG GAGAL. Log:"
  docker compose -f "$COMPOSE" logs --tail 40
  exit 1
fi
echo ">> stack sehat. Funnel: tailscale serve --bg --https=7443 http://127.0.0.1:7014"
