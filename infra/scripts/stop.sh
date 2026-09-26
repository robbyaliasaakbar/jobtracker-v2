#!/usr/bin/env bash
set -euo pipefail

# scripts/stop.sh — matikan stack JobTracker v2 (backend-api + caddy saja).
# Auth :7002, Postgres, dan service lain tetap hidup.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

docker compose -f "$ROOT/infra/docker-compose.stack.yml" down
echo "Stack JobTracker v2 dimatikan. Service lain tidak disentuh."
