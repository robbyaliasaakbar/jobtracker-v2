# infra — Caddy 1 pintu + compose stack

Satu folder ini yang nyervis dua hal: **API lamaran `:7012`** dan **proxy auth `:7002`** lewat Caddy `:7014`.

## Isi

| File | Fungsi |
|---|---|
| `Caddyfile` | Routing `:7014` — `/api/*`→7012, `/auth/*`→7002 (strip prefix `/auth`), `/health`→ok |
| `docker-compose.stack.yml` | `backend-api` (multi-stage `runner`, healthcheck, `restart:always`) + `caddy:2-alpine` |
| `scripts/start.sh` | `up -d --build` + tunggu sehat + verifikasi 4 endpoint |
| `scripts/stop.sh` | `down` — cuma stack ini, service lain tidak disentuh |

## Keputusan yang perlu diketahui

- **Postgres tidak di-stack ini.** Reuse container `postgres` yang sudah jalan di `:5432`
  (DB `jobtracker_v2`). `DB_HOST` di-override ke `host.docker.internal` waktu container nyala.
- **Caddy `network_mode: host`.** Biar Caddyfile dengan `127.0.0.1:7012/7002` berlaku persis
  (skeleton PRD), tanpa perlu nebak DNS container.
- **`restart: always`** (bukan unless-stopped) — keputusan bang rob: PC dinyalakan, container
  nyala sendiri, lupa tidak masalah.

## Pemakaian

```bash
../scripts/start.sh    # dari folder infra/ — atau: bash infra/scripts/start.sh
curl localhost:7012/health   # {"ok":true}
curl localhost:7014/health   # ok
../scripts/stop.sh
```

## Funnel (publik 1-satunya)

```bash
tailscale serve --bg --https=7443 http://127.0.0.1:7014
tailscale funnel status
```

**Jangan disentuh** (sudah hidup, service lain): `:443→7002`, `:8443→7005`, `:9443→7010`, `:10000→n8n`.
