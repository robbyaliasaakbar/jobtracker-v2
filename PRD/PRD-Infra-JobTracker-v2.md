# PRD-Infra-JobTracker-v2 (utama)

> Tanggal: 26-09-2026
> Pemilik: bang rob
> Status: LOCKED - siap build

## 1. Latar Belakang & Tujuan
- App jobtracker FE lama statis HTML (auth.html, index.html, js/*). Gembel, mau naik ke standar komersil.
- Backend ada 2: auth shared `:7002` (PHP + SQLite, FROZEN) + API lamaran yang mau dibikin baru.
- Path local backend auth ada disini: `/home/obi/Documents/dir_openwebui/Project website/backend`
- Mau testing lokal dulu di sandbox `/home/obi/Projects/upgraded app/jobtracker`, baru timpa ke `/home/obi/Documents/dir_openwebui/Project website/Website Baru/public_html/jobtracker` buat live Pages.
- Tujuan: enterprise standar, PC jadi server pribadi Rp0, siap pindah VPS tanpa ubah kode app.
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## 2. Cakupan Service
- In scope: `frontend/` React+Vite baru (port dev 7013, live Pages), `backend-api/` Node Express baru `:7012`.
- Frozen (ditempel doang): auth pusat PHP `:7002` (`/api/register, /login, /me, /verify, /forgot, /reset`). Jangan diutak-atik.
- Out of scope: miniLeads, ContentOS, CV screening, n8n.
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## 3. Scope (Wajib vs Backlog)
Wajib (7):
1. UI komersil anti AI-slop (Tailwind + design token).
2. FE React+Vite full baru (`pages/, components/, api/, store/`).
3. BE API baru `:7012` + API client (auth tetep ke lama).
4. Build statis `dist/` buat Pages + online via funnel.
5. Caddy 1 pintu `:7014`.
6. Dockerfile multi-stage + compose healthcheck + Postgres + `restart:always`.
7. `start.sh/stop.sh` + CI dasar lint→test→build.
Backlog (jangan dikerjain): monitoring Prometheus/Grafana, VPS, domain custom, managed DB, Vault, k8s, systemd timer, 1 Caddy semua app.
- Keputusan: bang rob, 26-09-2026, biaya Rp0. Monitoring dicoret ke backlog saran Udin, disetujui bang rob.

## 4. Topologi Jaringan & Domain
- Tetap Tailscale Funnel gratis `*.ts.net`. Publik cuma 1: `:7443 → 127.0.0.1:7014` (Caddy).
- Jangan timpa yang hidup: `:443→7002`, `:8443→7005`, `:9443→7010`, `:10000→n8n`.
- Booking baru: BE `7012`, FE dev `7013`, Caddy lokal `7014`, Postgres reuse `5432` DB `jobtracker_v2`.
- Caddy routing:
  - `/api/*` → `127.0.0.1:7012` (BE baru)
  - `/auth/*` → `127.0.0.1:7002` (proxy numpang, auth frozen, tidak diubah)
  - `/health` → Caddy sendiri 200
- FE live di `robbyaliasaakbar.github.io/jobtracker` (PUBLIC). BE tidak ikut ke-push ke porto.
- Keputusan: bang rob, Tier B, 26-09-2026, biaya Rp0.

### Skeleton Caddyfile (infra/Caddyfile)
```
:7014 {
  handle /api/* {
    reverse_proxy 127.0.0.1:7012
  }
  handle /auth/* {
    reverse_proxy 127.0.0.1:7002
  }
  handle /health {
    respond "ok" 200
  }
  log {
    output stdout
    format json
  }
}
```

## 5. Detail Komponen Wajib
1. UI komersil: config Tailwind + `design-token.css`. Verifikasi: cek visual anti-slop. Rollback: revert commit FE.
2. FE React+Vite: `.env` `VITE_AUTH_URL`, `VITE_API_URL`. Verifikasi: `:7013` dev + `dist/` build. Rollback: serve dist lama.
3. BE baru `:7012` Node+Knex: `.env` `DATABASE_URL`. Verifikasi: `/health` 200. Rollback: compose down, Caddy ke lama.
4. Build Pages: script copy `dist/index.html + assets/` ke porto. Verifikasi: Pages live. Rollback: revert commit porto.
5. Caddy `:7014`: Caddyfile di atas. Verifikasi: curl lokal + funnel. Rollback: matiin Caddy, funnel langsung.
6. Docker + Postgres: multi-stage + healthcheck + always. Verifikasi: healthy <60s. Rollback: image tag sebelumnya.
7. start/stop: `scripts/start.sh`, `stop.sh`, `restart:always` + `systemctl enable docker`. Verifikasi: reboot tetap nyala. Rollback: manual compose.
- FLAG: auth.db FROZEN, backup dulu, cutover read-only.
- Keputusan: bang rob, opsi B semua + always, 26-09-2026, Rp0.

### Skeleton docker-compose.stack.yml (infra/docker-compose.stack.yml)
```yaml
services:
  backend-api:
    build:
      context: ../backend-api
      target: runner
    restart: always
    expose:
      - "7012"
    ports:
      - "7012:7012"
    env_file:
      - ../backend-api/.env
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:7012/health').then(r=>{if(!r.ok)process.exit(1)})"]
      interval: 10s
      timeout: 5s
      retries: 6
    logging:
      driver: json-file
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "7014:7014"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      backend-api:
        condition: service_healthy
```

### Skeleton Dockerfile multi-stage
```dockerfile
# backend-api/Dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# frontend/Dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
```

## 6. Alur Operasional Harian
1. PC nyala → Docker daemon nyala → container `restart:always` nyala sendiri.
2. Caddy `:7014` nunggu BE `:7012` healthy.
3. Cek `curl :7012/health + :7014/health` 200.
4. Funnel `:7443 → :7014` nyambung.
5. FE Pages dibuka reviewer bisa login via auth `:7002`.
6. Malam PC dimatiin manual, semua ikut mati. Besok nyala sendiri (mitigasi pelupa).
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## 7. Struktur File/Repo
```
jobtracker/ (sandbox /home/obi/Projects/upgraded app/jobtracker)
 ├─ frontend/ (React+Vite, .env.example, Dockerfile)
 ├─ backend-api/ (Node :7012, Knex migrations/, Dockerfile)
 ├─ infra/
 │   ├─ Caddyfile
 │   ├─ docker-compose.stack.yml
 │   ├─ scripts/start.sh
 │   ├─ scripts/stop.sh
 │   └─ README.md
 ├─ .github/workflows/backend.yml
 ├─ .github/workflows/frontend.yml
 ├─ README.md, .gitignore, .env.example
 └─ PRD-*.md (3 file ini)
```
- Live: cuma `frontend/dist/` → `public_html/jobtracker`. BE/infra ke repo BE terpisah.
- Prinsip: app tidak tahu PC/VPS, semua via env.
- Keputusan: bang rob, 26-09-2026, Rp0.

## 8. Uptime & Scheduling
- 08.00-21.00 WIB = representasi kebiasaan kerja, bukan timer literal. Manual on/off.
- Tanpa systemd timer (keputusan bang rob, biar manual).
- Tetap valid setelah restart: token 1 jam dari auth lama, data lamaran di Postgres via volume, session di DB baru.
- Dokumen: designed for scheduled availability, bukan bug.
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## 9. Tech Stack Tier A/B/C
- Tier A (dikuasai): HTML statis, PHP SQLite, single-stage, port mentah, manual. Plus gampang. Minus gembel + tidak VPS-ready. Rp0.
- Tier B (dipilih, REKOMENDASI): React+Vite, Node :7012 + Knex + Postgres reuse, Caddy :7014 + funnel 7443, multi-stage + healthy + always, start/stop.sh, Actions public unlimited, log JSON. Plus VPS-ready + naik skill. Minus setup awal. Biaya Rp0. Keputusan bang rob 26-09-2026.
- Tier C (BACKLOG, jangan kerjakan): VPS ~Rp80-150rb/bln, domain ~Rp150rb/thn, managed Postgres ~Rp200rb+/bln, monitoring, Vault, k8s. Plus 24/7. Minus bayar + overkill.

## 10. Verifikasi "Siap Pindah ke VPS"
| Cek | Cara | Harapan |
|---|---|---|
| Stack up | `docker compose -f infra/docker-compose.stack.yml up -d` | Semua healthy <60 detik, tanpa edit kode app |
| BE sehat | `curl localhost:7012/health` | 200 `{"ok":true}` |
| Caddy sehat | `curl localhost:7014/health` | 200 |
| Publik | `curl https://*.ts.net:7443/health` | 200 via internet |
| FE build | `npm run build` di frontend/ | `dist/index.html + assets/` jadi |
| Live login | Buka Pages + login | Token dari `:7002` bisa, lamaran dari `:7012` bisa |
| Data survive | `compose down + up` | COUNT lamaran sama |
| CI hijau | Push ke main | Actions hijau |
| Auth aman | Cek auth.db timestamp + login app lain | Tidak berubah, app lain tetap bisa login |
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## 11. Rencana Implementasi Bertahap
1. FE skeleton + UI komersil.
2. BE baru `:7012` + DB `jobtracker_v2` + Knex.
3. Cutover SQLite→Postgres (read-only auth, backup dulu, simpan H+7).
4. Caddy `:7014` + funnel `:7443`.
5. Multi-stage + compose healthy + always.
6. CI hijau.
7. Build `dist/` → timpa porto live.
- FLAG KERAS: auth.db FROZEN. Cutover cuma baca lamaran, haram tulis ke auth. Knex haram konek ke auth. Keputusan bang rob, 26-09-2026.

## 12. Keputusan Locked (ringkasan)
- No.1-12 + C1-C4 + D1-D3: bang rob ketok semua, 26-09-2026, Tier B Rp0.
- Port booking: BE 7012, FE 7013, Caddy 7014, funnel 7443, Postgres reuse 5432 DB baru. Tier B, Rp0.
- `restart:always` (bukan unless-stopped): bang rob, alasan pelupa + PC desktop, 26-09-2026, Rp0.
- Repo PUBLIC semua (porto + BE baru): Actions unlimited, secret di-ignore. 26-09-2026, Rp0.
- Tier C backlog: VPS ~Rp80-150rb/bln, domain ~Rp150rb/thn, managed Postgres ~Rp200rb+/bln. Jangan dikerjain, dicatat doang.

---
Next: bilang **"gas build"** buat mulai build. Jangan ngoding sebelum itu.
