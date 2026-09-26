# Jobtracker v2

Buku besar lamaran kerja: catat, pantau status, urus di satu tempat.
Repo ini adalah sandbox build v2 (PRD LOCKED, Tier B, Rp0) — FE React+Vite baru,
BE Node baru, Caddy 1 pintu, Docker, CI.

> Status sekarang: **ter-build & terverifikasi lokal.**
> Auth pusat `:7002` **FROZEN** — jangan diutak-atik, cuma dibaca.

## Port booking (jangan ditabrak)

| Port | Layanan | Status |
|---|---|---|
| 7002 | Auth PHP (SQLite, frozen) | hidup — service lain |
| 7012 | BE baru (Node+Knex+Postgres) | stack ini |
| 7013 | FE dev (Vite) | dev lokal |
| 7014 | Caddy 1 pintu | stack ini |
| 7443 | Tailscale Funnel → 7014 | 1-satunya publik |
| 5432 | Postgres reuse, DB `jobtracker_v2` | service lain |

Funnel lama **jangan disentuh**: `:443→7002`, `:8443→7005`, `:9443→7010`, `:10000→n8n`.

## Struktur

```
jobtracker/
 ├─ frontend/            React+Vite, Tailwind v4 + design-token, port dev 7013
 │   ├─ src/{api,components,pages,store,data,styles}
 │   ├─ .env.example / .env.production (funnel + base /jobtracker/)
 │   ├─ Dockerfile (multi-stage -> nginx runner)
 │   └─ scripts/deploy-pages.sh   -> salin dist/ ke repo porto
 ├─ backend-api/         Node Express :7012 + Knex + Postgres
 │   ├─ src/  app, server, routes, auth (baca /api/me), validate
 │   ├─ migrations/001_create_lamaran.js
 │   ├─ scripts/migrate-lamaran.js   -> cutover SQLite->Postgres (read-only)
 │   └─ Dockerfile (multi-stage -> runner)
 ├─ infra/               Caddyfile + docker-compose.stack.yml + start/stop.sh
 ├─ .github/workflows/   frontend.yml + backend.yml (lint -> test -> build)
 ├─ PRD/                 dokumen terkunci (baca sebelum ubah apapun)
 └─ auth.html, index.html, js/, css/   = ARSIP FE v1 (rollback, jangan dihapus)
```

## Jalan lokal

**Backend:**

```bash
cd backend-api
cp .env.example .env        # isi DB_* (password Postgres lokal)
npm install
npm run migrate             # buat tabel lamaran
npm start                   # :7012 -> GET /health {"ok":true}
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev                 # http://localhost:7013
```

Dev tanpa `.env` otomatis nembak `hostname:7002` (auth) dan `hostname:7012` (API) —
pola yang sama dengan FE v1.

## Stack Docker (start/stop)

```bash
bash infra/scripts/start.sh    # up --build + verifikasi 4 endpoint
bash infra/scripts/stop.sh
```

- `restart: always` → PC nyala, container nyala sendiri.
- Caddy `network_mode: host` biar Caddyfile `127.0.0.1` berlaku persis.
- Postgres TIDAK di-stack ini (reuse container `postgres`).

## Data & cutover

- Tabel `lamaran` di DB `jobtracker_v2` (Postgres). Kolom & enum status **identik**
  dengan backend lama supaya data campur mulus.
- Cutover sekali jalan (SUDAH DIJALANKAN 26-09-2026): 4 baris pindah, COUNT cocok,
  sample cocok. Backup: `auth.db.bak-cutover-*` — **simpan minimal H+7**.
- Ulang: `SQLITE_PATH=/path/auth.db npm run cutover` (idempoten, baca read-only).

## Build & live Pages

```bash
PORTO_DIR="/path/ke/public_html/jobtracker" frontend/scripts/deploy-pages.sh
# hasil: dist/index.html + assets/ (base /jobtracker/) tersalin, tinggal push porto
```

URL produksi diarahkan ke Caddy via funnel (`frontend/.env.production`).

## CI (hijau = lint bersih + test lolos + build sukses)

- `frontend.yml`: `npm ci → lint → test → build`
- `backend.yml`: `npm ci → lint → test → docker build` (+ service Postgres buat test integrasi)
- Trigger: push `main` + `pull_request`. Merah = jangan merge, benerin lokal.

## Verifikasi "siap pindah ke VPS"

| Cek | Cara | Harapan |
|---|---|---|
| Stack up | `bash infra/scripts/start.sh` | semua sehat <60 dtk, tanpa ubah kode app |
| BE sehat | `curl localhost:7012/health` | `{"ok":true}` |
| Caddy sehat | `curl localhost:7014/health` | 200 |
| Publik | `curl https://<host>.ts.net:7443/health` | 200 via internet |
| FE build | `cd frontend && npm run build` | `dist/index.html + assets/` |
| Data survive | `stop.sh` lalu `start.sh` | COUNT lamaran tetap |
| CI hijau | push ke main | Actions hijau |
| Auth aman | `auth.db` timestamp + login app lain | tidak berubah |

## Jam operasional (by design)

Backend bangun sekitar **08.00–21.00 WIB** (manual, tanpa systemd timer — keputusan
bang rob). Di luar jam itu login/API tidak terjangkau dan app menampilkan layar
"Server sedang tidur" — sesi tidak dibuang. Ini disengaja, bukan bug.

## Backlog (jangan dikerjain)

Monitoring Prometheus/Grafana, VPS, domain custom, managed DB, Vault, k8s,
systemd timer, 1 Caddy untuk semua app.
