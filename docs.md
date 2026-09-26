# docs.md — JobTracker v2: Catatan Build dari Sudut Pandang Gue (Udin)

> Ditunggu bang rob buat dipelajari sebelum naik ke EXP016.
> Gue tulis first person, apa adanya — termasuk bagian yang gagal dan yang belum kebukti.
> Tanggal build: 26–27 September 2026. Repo: `robbyaliasaakbar/jobtracker-v2` (PUBLIC).

---

## 1. Apa aja yang gue lakuin

Gue dapet instruksi singkat: baca PRD (2 file, status LOCKED), konfirmasi, tunggu "gas build", lalu eksekusi semua isi PRD. Yang gue kerjain, berurutan:

**Riset & kontrak (sebelum nulis 1 baris kode pun):**
- Gue baca dua-duanya PRD, terus gue baca FE v1 lama (`js/store.js`, `auth.js`, `guard.js`) buat ngerekonstruksi kontrak API yang udah ada: key token `jobTracker.token`, shape response lamaran `{id:string, company, position, date, status, portal, link, createdAt}`, enum 7 status.
- Gue baca backend auth PHP (`public/index.php`, `lamaran.php`, `auth.php`) **read-only** buat mastiin: `/api/me` balikin `{email,...}`, router PHP butuh path persis `/api/*`, dan CORS-nya ngapain. Ini yang bikin gue nangkep dua bug desain di skeleton PRD sebelum kejadian (lihat §7, F12).
- Gue cek environment: node 22, docker hidup, container `postgres` & auth `:7002` jalan, port 7012/7013/7014/7443 kosong, `node:sqlite` tersedia.

**Backend (`backend-api/`, port 7012):**
- Express 5 + Knex 3 + Postgres, CommonJS (biar knexfile gak ribet), struktur `src/{app,server,db,auth,validate,pgtypes,routes}`.
- Middleware token: verifikasi ke auth frozen lewat `GET /api/me` — **cuma baca, gak pernah nulis** ke auth.
- CRUD `/api/lamaran` dengan kontrak & pesan error identik PHP lama (biar data lama-baru campur mulus).
- Migration `001_create_lamaran.js` persis spek PRD D2, jalan otomatis sekali pas boot container.
- Script cutover `scripts/migrate-lamaran.js` (PRD D3): backup → baca SQLite read-only dari file backup → insert ke Postgres → verifikasi COUNT + 5 sample. Idempoten (signature-based).
- Test: unit (validasi) + integration (Postgres test DB + stub auth server). Dockerfile multi-stage target `runner`.

**Frontend (`frontend/`, React+Vite, dev 7013):**
- Gue bikin design plan dulu sebelum ngoding (brief anti AI-slop): konsep **"buku besar lamaran"** — palet kertas `#F6F2E9` + tinta `#16181C` + satu aksen stempel vermilion `#C2412D`, tipografi Fraunces (display) + IBM Plex Sans/Mono (data), layout ledger hairline bukan card shadow.
- Full baru: `src/{api,components,pages,store,data,styles}`. Store pake `useReducer` + context polos (tanpa zustand/redux), routing pake state (tanpa react-router) — FE v1 juga gitu, cukup buat 2 layar.
- 5 mode auth (masuk/daftar/OTP/lupa/reset) ngomong ke auth frozen, dashboard dengan strip pipeline 7 status + tabel ledger desktop / kartu mobile + modal form, layar "Server sedang tidur" buat di luar jam operasional.
- `.env.production` diarahkan ke funnel `https://aispec.tail06293c.ts.net:7443` (+ suffix `/auth`); asset build **relatif** (`base: './'`, lihat F16).

**Infra & CI:**
- `infra/Caddyfile` (1 pintu 7014), `docker-compose.stack.yml` (backend-api + caddy, healthcheck, `restart:always`), `start.sh`/`stop.sh` dengan verifikasi 4 endpoint otomatis.
- Funnel `tailscale funnel --bg --https=7443` → Caddy. Funnel lama (8443/9443/10000) **tidak gue sentuh**.
- 2 workflow GitHub Actions sesuai skeleton PRD + tambahan service Postgres (lihat F13).
- Cutover beneran dijalanin: **4 baris pindah, COUNT cocok, sample cocok**, backup `auth.db.bak-cutover-*`.
- Deploy live: build `dist/` → salin ke repo porto `public_html/jobtracker` → push. Live di `robbyaliasaakbar.github.io/jobtracker`.
- Repo `jobtracker-v2` PUBLIC kebentuk + terpush (PRD C1), CI hijau.

## 2. Gimana cara gue ngetest & mastiin semuanya aman

Gue pake pendekatan berlapis — tiap lapis nangkep jenis kegagalan yang beda:

**Lapis 1 — Lint (static):** `eslint .` di dua app, target **0 error 0 warning**. Ini yang nangkep duplikat import & directive mati (F5, F6).

**Lapis 2 — Unit test (`node --test` BE, `vitest` FE):**
- BE 16 test: validasi input (enum status, format tanggal, auto-`https://` link, ID digit-only), health endpoint, satpam 401 (tanpa token / token mati), CORS preflight, rute 404.
- FE 21 test: reducer murni (urut tanggal paritas SQL `NULLS LAST`, upsert gak dobel, logout bersih, toast), resolusi basis URL, dan **smoke render** semua halaman via `renderToString` — nangkep import mati/typo JSX tanpa perlu browser.

**Lapis 3 — Integration test (yang paling berbobot):** CRUD penuh against Postgres beneran (`jobtracker_v2_test`, auto-create kalau belum ada) + **stub auth server** lokal (deterministik, gak peduli `:7002` hidup/mati). Gue uji: create → list → edit → delete, **isolasi antar pemilik** (baris user lain disuntik langsung ke DB — gak boleh muncul di list; edit baris orang lain → 404), validasi → 422, tanpa token → 401. Test inilah yang nangkep bug tanggal (F2).

**Lapis 4 — Build & image:** `npm run build` sampai `dist/index.html + assets/` dengan asset path **relatif** (`./assets/`, lihat F16), `docker build` dua-duanya (target `runner`), `npm ci` harus mulus (lockfile ke-commit).

**Lapis 5 — Runtime live (curl beneran):**
- Lokal: `:7012/health` → `{"ok":true}`; `:7012/api/lamaran` tanpa token → 401 (bukti nyambung ke auth asli); `:7014/health` → 200; `:7014/api/health` → 200 (proxy BE); `:7014/auth/api/me` → 401 (proxy auth jalan, strip_prefix bener).
- **Publik via internet:** `https://aispec...ts.net:7443/{health,api/health}` → 200, `/auth/api/me` → 401.
- Data survive: `stop.sh` → `start.sh` → COUNT tetap 4, semua sehat lagi <60 dtk.

**Lapis 6 — Cutover verification (sekali jalan, gak boleh salah):** script-nya sendiri yang exit 1 kalau COUNT beda atau sample gak cocok. Hasilnya: 4/4 baris, 4 sample field identik. `auth.db` asli gue cek mtime-nya **gak berubah** (masih timestamp sebelum sesi gue) — bukti cuma kebaca lewat file backup, readOnly.

**Lapis 7 — CI di mesin bersih:** push ke `main` → Actions jalan `npm ci → lint → test → build/docker build` dari nol. 4 run, hijau semua — bukti build gak cuma jalan "di laptop gue".

**Lapis 8 — Visual (headless Chrome):** gue screenshot hasilnya (login desktop/mobile, dashboard, modal tambah, mobile cards) terus gue review sendiri sebagai design check anti-slop. Ada 1 hasil review yang bikin gue revisi (contoh halaman login nampilin kode mentah `interview-hr` → gue ganti jadi badge).

**Yang BELUM / gak bisa gue buktikan (jujur):**
1. **E2E login beneran dari browser** — gue gak punya kredensial & gak mau daftar akun (itu nulis ke auth.db, kena flag frozen). Klik terakhir ini milik bang rob.
2. **Reboot PC → `restart:always` nyala sendiri** — cuma kebaca dari config, mesinnya gak gue reboot.
3. **Load/concurrency & pen-test** — gak ada sama sekali. Rate limiting juga gak ada (lihat §3).
4. Interaksi JS (submit form, toast auto-hilang) kecover smoke test + screenshot, **bukan** browser E2E framework (gak ada Playwright/Cypress).

## 3. Security-nya gimana

**Pemisahan auth (prinsip paling keras):**
- Auth PHP `:7002` + `auth.db` = **FROZEN**. Kode gue gak pernah nulis ke sana. Satu-satunya interaksi: `GET /api/me` dengan Bearer token (baca doang), itu pun dari middleware yang nanya "kartu ini sah gak?".
- Knex **haram** konek ke auth.db — koneksi Knex cuma ke Postgres `jobtracker_v2`.
- Cutover: dibuka **read-only dari file backup**, bukan file aslinya. File backup = tulisan baru, auth.db asli gak pernah kebuka buat ditulis. Buktinya mtime auth.db gak berubah.

**Token & sesi:**
- Token opaque (bukan JWT yang bisa dibaca isinya) — FE cuma nyimpen `jobTracker.token` di localStorage, dikirim `Authorization: Bearer`.
- TTL 1 jam dipegang auth lama (FE v1 juga 1 jam). Token mati → 401 → FE buang token → tendang ke halaman masuk.
- Auth lagi tidur → BE balas **503** ("layanan login tidak terjangkau"), bukan 401 — biar user gak dikira-ngira kartunya palsu, dan server gak pura-pura valid.
- Gak ada log yang nyimpen token (log JSON cuma method/path/status/ms).

**Isolasi data per user:**
- Tiap query lamaran selalu `WHERE email = pemilik dari /api/me`. Email gak pernah datang dari request body — diambil dari hasil verifikasi token.
- Gue buktiin pakai test: suntik baris milik "tetangga" langsung ke DB → gak muncul di list; `PUT/DELETE` baris orang lain → 404 (bukan 403, biar gak ngomong "ada, tapi bukan lo" — paritas anti-intip versi PHP lama).

**Input & database:**
- Semua query lewat Knex (parameterized) — string user gak pernah jadi SQL. ID wajib digit (`/^\d+$/`) sebelum dipakai.
- Validasi sama persis PHP lama: wajib perusahaan+posisi, tanggal `yyyy-mm-dd`, status harus 1 dari 7 enum, link auto-tambah `https://` kalau protokol kosong, ada batas panjang field (200/500 char) + body limit 200kb.

**CORS:**
- Allowlist eksplisit (`ALLOWED_ORIGIN`) + aturan host-sebanding (origin host == host request) — pola yang sama dengan auth PHP, jadi gak nge-buka lebar ke situs asing tapi tetap izinin share via Tailscale.
- Sebelum push ke live, gue **cek dulu** `CORS_ORIGINS` auth PHP** — kalau `https://robbyaliasaakbar.github.io` gak ada di situ, login dari Pages bakal CORS-block dan baru ketahuan SETELAH deploy (gak ada kredensial buat test). Untungnya ada.

**Secret & permukaan publik:**
- Repo PUBLIC → `.env` di-`.gitignore`, `.env.example` cuma placeholder (password Postgres gak pernah ke-commit). FE juga gak nyimpen rahasia (semua URL publik).
- Publik cuma **1 pintu**: funnel `:7443` → Caddy `:7014`. Port 7012/7002/5432 cuma di localhost/host.
- `x-powered-by` dimatikan, pesan error server generik ("Terjadi kesalahan server") — internal gak kebocor ke user (paritas pola PHP-nya).

**Yang gue akui JUJUR belum aman:**
- **Gak ada rate limiting / anti-brute-force di BE baru** — urusan login (percobaan password, OTP) tetap di tangan auth lama.
- Repo publik = kode terbuka (bukan rahasia, tapi jadi bahan rekayasa).
- Gak ada audit log, gak ada pen-test, gak ada dependency scan CI.
- TLS percaya di Tailscale Funnel; di lokal memang HTTP (jaringan lokal).

## 4. Arsitektur apa yang dipake

Pola: **static SPA + API terpisah + auth terpisah, disatukan 1 reverse proxy** (BFF ringan lewat Caddy), semua stateful di Postgres yang udah ada. Kuncinya: **app gak tahu PC/VPS — semua lewat env**, jadi pindah VPS cukup ganti env + jalankan compose yang sama.

```
                        INTERNET (1 pintu saja)
                                 │
              https://<host>.ts.net:7443  (Tailscale Funnel)
                                 │
                 ┌───────────────▼────────────────┐
                 │  Caddy :7014 (network: host)   │  ← 1 pintu, log JSON
                 │  /api/*  → 127.0.0.1:7012      │
                 │  /auth/* → 127.0.0.1:7002      │  (strip prefix /auth)
                 │  /health → dirinya sendiri     │
                 └──────┬────────────────┬────────┘
                        │                │
      ┌─────────────────▼──┐   ┌─────────▼──────────────────┐
      │ backend-api :7012  │   │ auth PHP :7002  [FROZEN]   │
      │ Express+Knex+Pg    │──▶│ PHP + SQLite auth.db       │
      │ (GET /api/me only) │   │ /api/{login,me,register..} │
      └─────────┬──────────┘   └─────────┬──────────────────┘
                │ SQL                    │ file (read-write, oleh dia sendiri)
      ┌─────────▼──────────┐   ┌─────────▼──────────────────┐
      │ Postgres :5432     │   │ auth.db + backup cutover   │
      │ DB jobtracker_v2   │   │ (backup H+7, asli frozen)  │
      └────────────────────┘   └────────────────────────────┘

  GitHub Pages (robbyaliasaakbar.github.io/jobtracker)
  = dist/ statis. Browser nembak funnel ts.net buat /api + /auth (CORS allowlist).
```

**Alur 1 request lamaran:** browser → `https://...:7443/api/lamaran` → Caddy → BE baru → middleware minta token → `GET auth:7002/api/me` → dapat email → query Postgres `WHERE email=...` → balik ke browser. Auth & data ngomong langsung, browser cuma jadi pengantar.

**Port booking:** BE 7012 · FE dev 7013 · Caddy 7014 · Funnel 7443 · Auth 7002 · Postgres 5432 (reuse). Yang lama (443/8443/9443/10000) gak disentuh.

**Deployment:** FE = build statis → push repo porto. BE + infra = repo `jobtracker-v2` + Docker. `restart:always` → PC nyala, stack nyala sendiri (operasi manual 08.00–21.00 WIB by design).

## 5. Framework-nya apa aja

| Layer | Yang dipake | Catatan |
|---|---|---|
| Frontend UI | **React 19.3** | Library (bukan Next.js) — butuhnya SPA statis buat GitHub Pages, gak ada SSR |
| State | **React context + `useReducer`** | Murni React, tanpa Redux/Zustand — skala app cuma 2 layar |
| Routing | **state-based (tanpa react-router)** | Pola sama kayak FE v1 (auth.html↔index.html); cukup buat tamu/online/offline |
| Styling | **Tailwind CSS 4.3** (via `@tailwindcss/vite`) | Utility-first + `design-token.css` (`@theme`) sendiri |
| Backend | **Express 5.2** | Framework HTTP BE; routing polos 1 file rute |
| Query builder | **Knex 3.3** | Bukan ORM berat — query builder + migrasi (sesuai spek PRD D2) |
| Migrasi DB | **Knex migrate** | `migrations/001_create_lamaran.js`, `knex migrate:latest`, bukan ALTER manual |

Gue **sengaja gak nambah** framework lain: tanpa Next, tanpa ORM berat, tanpa state library, tanpa router library, tanpa icon library. Tiap dependensi yang gak gue butuhin = satu misteri kurang pas deploy.

## 6. Keseluruhan stack

**Runtime & tooling:** Node.js 22.23.1 · npm 10.9.8 · Docker 29.6.1 · Docker Compose v5.2.0 · Git 2.53 · GitHub Actions · ESLint (BE 9.39 / FE 10.11).

**Frontend (`frontend/`):** react 19.3.0 + react-dom 19.3.0 · vite 8.3.1 · @vitejs/plugin-react 6.1.1 · tailwindcss + @tailwindcss/vite 4.3.3 · vitest 5.0.2 · Font: Fraunces + IBM Plex Sans + IBM Plex Mono (Google Fonts) · Output: `dist/` → GitHub Pages · Dev port 7013 · Dockerfile: `node:22-slim` builder → `nginx:alpine` runner.

**Backend (`backend-api/`):** express 5.2.1 · knex 3.3.0 · pg 8.23.0 · dotenv 16.6.1 · node:test (bawaan, tanpa library) · node:sqlite (bawaan, buat cutover) · Port 7012 · Dockerfile: `node:22-slim` builder → runner.

**Data:** PostgreSQL 18.4 (container `postgres` yang udah ada, port 5432 — **reuse, bukan install baru**) · DB `jobtracker_v2` (+ `jobtracker_v2_test` buat test) · Schema `public`, tabel `lamaran` · SQLite `auth.db` tetap di auth lama (FROZEN).

**Infra:** Caddy 2 (`caddy:2-alpine`) di `:7014` · Tailscale Funnel `:7443` (1-satunya publik) · compose: `restart:always`, healthcheck `node fetch`, log `json-file`.

**Keputusan Tier (PRD):** Tier B — React+Vite, Node+Knex+Postgres reuse, Caddy+funnel, multi-stage Docker, start/stop.sh, Actions publik. **Biaya total Rp0.**

## 7. Kegagalan & kejadian selama develop (JUJUR — ini bagian paling penting)

Gue catet semuanya, dari yang bikin malu sampai yang nyaris merusak production. Gak ada yang gue tutup-tutupin, karena malah dari sini pelajarannya.

**Ringkasan:**

| # | Kegagalan | Severity | Ketahuan di lapis |
|---|---|---|---|
| F1 | Salah pake API `node --test` → test gagal jalan | Kecil | Test run pertama |
| F2 | **Bug tanggal geser sehari (TZ) di semua data** | **Tinggi** | Integration test |
| F3 | `authApi.getToken` undefined → app bakal blank/stuck | **Tinggi** | Warning di output build |
| F4 | Gue nulis kode sampah di `App.jsx` (event global hack) | Sedang | Self-review |
| F5 | ESLint disable comment gak kepakai (2x salah fix) | Kecil | Lint |
| F6 | Duplikat import di `SampleLedger.jsx` | Kecil | Lint |
| F7 | Tooling nolak file gede / overwrite tanpa `old_text` | Kecil (workflow) | Proses edit |
| F8 | `pkill -f` bunuh shell sendiri (2x) | Kecil (workflow) | Command exit 1 |
| F9 | Race condition: `ls` paralel sama deploy → data basi | Sedang (false alarm) | Cek ulang sekuensial |
| F10 | Salah kutip SQL di `node -e` (SQLite baca `"table"`) | Kecil | Eksekusi |
| F11 | Nebak nama fungsi PHP lewat grep → gagal | Kecil | Eksekusi |
| F12 | Skeleton Caddyfile PRD **bisa bikin 2 bug production** | Dicegah | Baca kode sebelum run |
| F13 | Skeleton CI PRD gak ada DB → test ke-skip = "hijau palsu" | Dicegah | Rancang CI |
| F14 | Loop `sleep 45` kena hard timeout 30 detik tool | Kecil (workflow) | Eksekusi |
| F15 | **Container BE nembak `127.0.0.1` AUTH_URL → 503 saat live login** | **Tinggi** | Live user test |
| F16 | **Base Vite absolut `/jobtracker/` → asset 404 + UI blank putih di folder porto** | **Tinggi** | User QA + file:// test |
| F15 | **Container BE gak bisa telepon Auth lama (`127.0.0.1` vs `host.docker.internal`) → 503 saat live login** | **Tinggi** | Live user test (bang rob) |

**Detail:**

**F1 — Salah ngomong sama `node --test`.** Pertama kali `npm test` jalan dengan script `node --test test/`, Node nolak: `Cannot find module '.../backend-api/test'` — argumen posisinya dibaca sebagai *file*, bukan direktori. Ternyata Node 22 maunya `node --test` polos (dia sendiri yang nyari `**/*.test.js`). Fix: hapus argumennya. Gak ada kode rusak, tapi test gue sempat **0 jalan** padahal dikira "sudah ditest".

**F2 — Bug tanggal geser sehari. INI YANG PALING SERIUS.** Integration test gagal: gue simpen `2026-09-26`, yang balik `2026-09-25`. Akar masalahnya: `pg` mengubah kolom DATE Postgres jadi objek `Date` di **tengah malam waktu lokal**, lalu kode gue manggil `toISOString()` yang konversi ke UTC — server gue WIB (+7), jadi `2026-09-26 00:00 +07` = `2026-09-25 17:00 UTC` → tanggal meleset mundur sehari. **Kalau test ini gak ada:** semua tanggal lamaran yang tampil ke user meleset sehari, dan verifikasi cutover (sample tanggal) juga bakal salah. Yang bikin ngeri: ini bukan crash — app tetep jalan, keliatan normal, cuma datanya salah. Fix: `pg.types.setTypeParser(1082, v => v)` — DATE dibiarin string mentah `yyyy-mm-dd` (justru bikin paritas sama PHP yang juga string), dipasang di `src/pgtypes.js` yang dipakai server **dan** script cutover. **Pelajaran: bug TZ itu silent; integration test yang nyimpen-baca beneran satu-satunya tameng.**

**F3 — Build sukses, tapi app bakal crash di runtime.** Build Vite jalan mulus, tapi gue baca output-nya: ada warning `Import getToken will always be undefined`. Ternyata `AppStore` manggil `authApi.getToken()` tapi `auth.js` gak nge-export fungsi itu. Kalau gue cuekin: bootstrap bakal `TypeError` → layar "membuka buku besar…" **gak pernah selesai** di production, dan yang ada cuma 1 baris warning. Fix: re-export `getToken` dari `auth.js`. **Pelajaran: exit code 0 ≠ sukses — baca stderr/warning-nya.**

**F4 — Gue sempet nulis kode sampah sendiri.** Di `App.jsx` awalnya gue nulis onPop toast pake `window.dispatchEvent(new CustomEvent(...)) || toast` plus variable `dispatchToastPop` yang gak pernah ada — padahal state-nya udah di context, tinggal `popToast` biasa. Ini khas "nulis cepat tanpa mikir alur data". Gue ketahuan pas mau lanjut, terus gue tulis ulang bersih. **Pelajaran: kalau udah ada context/reducer, jangan balik ke event bus global — itu arsitektur yang gak konsisten.**

**F5 — Dua kali salah fix lint.** Muncul warning `Unused eslint-disable directive`. Fix pertama: gue tambahin komentar penjelas di belakang directive → **masih warning** (ESLint 9 tetep laporin directive yang gak dipakai, mau dikasih deskripsi). Fix bener: hapus directive-nya sekalian karena `argsIgnorePattern: '^_'` udah nutup. **Pelajaran: "cuma warning, bukan error" itu jebakan — targetnya 0 warning, bukan 0 error.**

**F6 — Duplikat import.** Gue revisi `SampleLedger.jsx` nambahin import `StatusBadge` + `DoubleRule` di atas file, tapi import `DoubleRule` lama yang ada di tengah file gue lupa buang → parsing error. Ketahuan langsung pas lint (untung lint jalan sebelum build/deploy). Ini akibat sampingan dari F7 (file gue pecah jadi bagian-bagian, jadi gampang kelewat).

**F7 — Tooling nolak file gede & overwrite diam-diam.** Beberapa kali editor nolak: `AuthPage.jsx` awal 9.828 karakter (limit 6.000), plus beberapa kali gue nyoba timpa file tanpa `old_text` (ditolak biar gak ada yang ketimpa diam-diam). Risikonya: gue kira file-nya udah nulis padahal belum — nyaris gue laporkan isi file salah. Fix: pecah AuthPage jadi `AuthPage + AuthFields + SampleLedger` (malah struktur lebih bersar), dan overwrite yang bener pake `old_text`/hapus dulu. **Pelajaran: baca balik hasil tiap edit, jangan asumsi ke-success-an tool.**

**F8 — `pkill` bunuh shell gue sendiri, 2 kali.** Gue jalanin `pkill -f 'node src/server.js'` — polanya kebetulan **match command-line shell yang lagi jalanin perintah itu juga**, jadi shell-nya mati sendiri, output hilang, exit 1 — hampir aja gue simpulkan "prosesnya gagal". Kena lagi pas `pkill -f 'vite --port 7013'`. Fix: pakai pola anti-self: `pkill -f 'vite --port 701[3]'` / `'node src/serve[r].js'`. **Pelajaran: `pkill -f` itu liar — dia bisa match dirinya sendiri.**

**F9 — Race condition gara-gara gue kecepatan paralelin.** Gue jalanin deploy ke porto dan `ls` folder tujuan **dalam satu batch paralel**. `ls` kebaca *sebelum* copy selesai → listing nunjukin `index.html` lama (15.416 byte, timestamp Sep 10) → hampir gue laporkan "deploy gagal, file gak ke-copy". Cek ulang sekuensial: semua ke-copy bener. **Pelajaran: paralelin buat hal yang bener-bener independen; producer (deploy) dan consumer (cek hasilnya) gak boleh paralel.**

**F10 — Kutipan SQL salah di one-liner.** `node -e "... WHERE type=\"table\""` → SQLite baca `table` sebagai nama kolom → error `no such column: "table"`. Fix: parameter binding (`type = ?`). Kecil, tapi nyaris buang waktu debug padahal cuma masalah kutipan shell.

**F11 — Gue nebak nama fungsi orang.** Gue grep `handle_me` di backend PHP → gak ketemu (exit 1, gue kira file-nya beda). Ternyata routernya manggil `email_dari_token()`. Fix: baca `public/index.php` (sang router) dulu sebelum nyari handler. **Pelajaran: baca pemanggilnya, jangan tebak nama yang dipanggil.**

**F12 — Skeleton PRD sendiri punya 2 bug yang gue cegah sebelum kejadian.** Ini bukan kegagalan eksekusi, tapi kegagalan *desain di dokumen* yang gue tangkap pas baca:
1. Skeleton Caddyfile targetnya `127.0.0.1:7012` tapi Caddy-nya ditaruh **di dalam container** — `127.0.0.1` di container = container itu sendiri, bukan host → proxy mati total. Fix: `network_mode: host` buat Caddy (sekaligus bikin Caddyfile persis skeleton PRD berlaku apa adanya).
2. `handle /auth/*` tanpa `strip_prefix` — padahal gue udah baca router PHP yang cuma mau path persis `/api/*`. Tanpa strip: **semua request auth 404** dan login live rusak. Fix: tambah `uri strip_prefix /auth`.

Kalau gue eksekusi skeleton tanpa baca kode PHP + mikirin network namespace, stack bisa keliatan "hijau" lokal tapi mati begitu disambung.

**F13 — Skeleton CI PRD bisa bikin "hijau palsu".** `backend.yml` versi PRD: `npm test --if-present` tanpa database service. Test integrasi gue butuh Postgres → kalau literal, test **ke-skip** di CI → CI tetap hijau tapi **gak ngetes apa-apa**. Fix: tambah service `postgres` + env `TEST_DATABASE_URL` (deviasi kecil dari skeleton, dicatat di README). **Pelajaran: hijau harus artinya "tesnya jalan", bukan "tesnya dilewati".**

**F14 — Loop polling kena hard timeout tool (2x).** Gue bikin `for … sleep 15/45` buat nunggu CI/Pages deploy → kena timeout 30 detik tool shell, command mati tengah jalan → sempet gue kira CI-nya hang. Fix: pecah jadi cek pendek-pendek.

**F15 — Container BE nembak `127.0.0.1:7002` (AUTH_URL) → loopback container sendiri → 503 saat fetch data lamaran di live.** Ini baru ketahuan pas bang rob login live dan dapet error `"Layanan login sedang tidak terjangkau. Coba lagi nanti"`. Analisisnya:
- Di `backend-api/.env`, `AUTH_URL` diisi `http://127.0.0.1:7002`.
- Saat dijalankan via `docker-compose.stack.yml`, `DB_HOST` udah gue override ke `host.docker.internal` (buat Postgres), **tapi `AUTH_URL` lupa dioverride!**
- Akibatnya, pas request `/api/lamaran` masuk membawa token, BE di dalam container mencoba validasi ke `http://127.0.0.1:7002/api/me` (artinya nembak port 7002 di container dia sendiri, bukan host mesin). Karena di container BE gak ada service di port 7002, request-nya rejected / fetch failed → middleware menganggap Auth server mati → return status **503**.
- Fix: tambahkan `AUTH_URL: http://host.docker.internal:7002` di bagian `environment` service `backend-api` pada `docker-compose.stack.yml`, lalu restart stack. Langsung solved & token check lolos ke Auth `:7002` host.
- **Pelajaran: semua endpoint host mesin yang dipanggil oleh container dari bridge network WAJIB mengarah ke `host.docker.internal`, bukan `127.0.0.1`.**

**F16 — Base Vite absolut `/jobtracker/` bikin UI blank putih pas file `index.html` build dibuka dari folder porto.** Ini ketahuan pas bang rob buka folder `public_html/jobtracker` dan UI-nya putih. Analisisnya:
- Hasil `npm run build` gue (base `/jobtracker/`) nempel path absolut di `index.html`: `src="/jobtracker/assets/index-xxx.js"`.
- Selama diserve dari root GitHub Pages (`https://…github.io/jobtracker/`), path itu **bener** → live aman.
- Tapi begitu dibuka lokal/file:///` atau diserve dari root lain (mis. `python3 -m http.server` di dalam folder jobtracker, atau path gak persis `/jobtracker/`), browser nyari `/jobtracker/assets/…` di root server → **404** → JS gak ke-load → `<div id="root">` kosong → layar putih tanpa error jelas (cuma 404 di console).
- Gue buktiin dengan: `file://` (blank, 2.137 byte), `http.server` dari dalam folder (blank + log 404 `/jobtracker/assets/…`), head serial, dan bandingin dengan ContentOS yang pola `base: './'` + asset relatif (`./assets/…`) — itu yang loading bener.
- Fix: `vite.config.js` diganti `base: './'` (ikuti pola `contentOS`/`miniLeads`), `VITE_BASE` dihapus dari `.env.production`+`.env.example`, rebuild → asset jadi relatif `./assets/…` → tahan di Pages `/jobtracker/`, di subfolder lain, maupun preview lokal. Skalian ESLint: file `assets/**` masukin ke `ignores` biar hasil build gak ikut ke-lint.
- **Pelajaran: build Pages gak boleh nempel path absolut kalau foldernya bisa dibuka dari konteks berbeda — relative base (`./`) itu opsi paling aman buat subfolder GitHub Pages.**

**Near-miss yang gue BERHASIL cegah (gagalnya dicegah, bukan kejadian):**
- **CORS live:** sebelum push ke porto, gue cek `CORS_ORIGINS` auth PHP — kalau origin Pages gak ada di situ, login live bakal diblokir browser dan **baru ketahuan setelah deploy** (gak ada kredensial buat test login). Untung ada, dan gue cek *sebelum* push, bukan sesudah.
- **Bug F2 merambat ke cutover:** parser-nya ikut gue patch di script cutover, jadi verifikasi sample tanggal gak ikut meleset.
- **Nyaris nulis ke auth.db:** gue sempet mikir "bikin akun test biar E2E login beneran" — batal, karena itu = nulis ke auth.db kena flag FROZEN + memicu kirim email OTP beneran. Gue pilih stub auth server di test.

**Kompromi & sisa yang gue akui (bukan failure, tapi harus sadar):**
1. Belum ada E2E login beneran (kredensial) — **satu-satunya verifikasi PRD §10 yang sisa, milik bang rob.**
2. `restart:always` pas reboot belum pernah diuji reboot beneran.
3. Test FE tanpa browser automation — interaksi kecover smoke render + screenshot manual.
4. Gak ada rate limiting, monitoring, audit log (monitoring emang di-backlog PRD).
5. Date input nampilin format ngikutin locale browser (`mm/dd/yyyy` kalau browser US) — tampilan tabel udah `yyyy-mm-dd`.
6. Backup cutover dibuat pas auth lagi jalan — ada chance kecil dapet file pas lagi nulis (gak kejadian, hasil verifikasi cocok semua, tapi secara teori mungkin).
7. Verifikasi visual gue lakuin via screenshot headless — gue **belum** lihat hasilnya di browser beneran dengan font fully loaded + interaksi mouse.

---

*Segitu catatan jujur gue. Yang paling gue ambil dari build ini: integration test beneran (F2) dan membaca output build baris per baris (F3) yang nyelamatin dari dua bug silent paling berbahaya — dua-duanya ada di kode yang kalau ditest asal-asalan bakal dibilang "udah beres, hijau".*
