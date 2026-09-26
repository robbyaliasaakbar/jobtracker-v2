# JobTracker-v2-cicd-db (CI/CD + migrasi DB)

> Tanggal: 26-09-2026
> Status: LOCKED - siap build

## C1 Repo & Visibility
- 1 repo sandbox `jobtracker-v2` PUBLIC dulu, isi 2 workflow: `frontend.yml` + `backend.yml`.
- Nanti split: `dist/` ke porto PUBLIC, BE ke repo BE PUBLIC bawa YAML-nya.
- Kenapa public: Actions gratis unlimited. Secret aman karena `.env` di-ignore.
- Keputusan: bang rob, 26-09-2026, biaya Rp0.

## C2 Steps Pipeline
- FE: `npm ci → lint → test → build dist/`
- BE: `npm ci → lint → test → docker build :7012` (skip push registry, pake lokal compose).
- Registry: skip dulu.
- Keputusan: bang rob, 26-09-2026, Rp0.

## C3 Trigger
- `on: push ke main + pull_request`. Tiap push dicek, tiap PR dicek sebelum merge.
- Keputusan: bang rob, 26-09-2026, Rp0.

## C4 Definisi Hijau
- Hijau = lint bersih + test lolos semua + build sukses.
- Merah = block merge, benerin lokal baru push lagi.
- Keputusan: bang rob, 26-09-2026, Rp0.

### Skeleton .github/workflows/backend.yml
```yaml
name: backend
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        working-directory: backend-api
      - run: npm run lint --if-present
        working-directory: backend-api
      - run: npm test --if-present
        working-directory: backend-api
      - run: docker build ./backend-api
```

### Skeleton .github/workflows/frontend.yml
```yaml
name: frontend
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        working-directory: frontend
      - run: npm run lint --if-present
        working-directory: frontend
      - run: npm test --if-present
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
```

## D1 Service & Alasan
- Pindah: `lamaran` jobtracker ke Postgres. Auth/users tetap SQLite `:7002` frozen.
- Kenapa: latihan relasional beneran + concurrent aman + siap VPS + reverse engineering.
- Postgres reuse `:5432`, DB baru `jobtracker_v2`, user baru terbatas.
- Keputusan: bang rob, 26-09-2026, Rp0.

## D2 Skema & Tool
- DB: `jobtracker_v2` (sejajar `evolution_db`, bukan di dalamnya). Schema `public`. Table `lamaran`.
- Table: `id SERIAL PK, email TEXT, company TEXT, position TEXT, tanggal DATE, status TEXT, portal TEXT, link TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ`, index `email`.
- Tool: Knex. File `migrations/001_create_lamaran.js`, `knex migrate:latest`. Bukan ALTER manual.
- Keputusan: bang rob, B1 reuse + DB baru, 26-09-2026, Rp0.

```js
// migrations/001_create_lamaran.js
exports.up = (k) => k.schema.createTable('lamaran', (t) => {
  t.increments('id').primary();
  t.string('email').notNullable().index();
  t.string('company').defaultTo('');
  t.string('position').defaultTo('');
  t.date('tanggal');
  t.string('status').defaultTo('baru');
  t.string('portal').defaultTo('');
  t.text('link').defaultTo('');
  t.timestamps(true, true);
});
exports.down = (k) => k.schema.dropTable('lamaran');
```

## D3 Cutover Plan
- Script sekali jalan `migrate-lamaran.js`: baca SQLite read-only → insert Postgres → `COUNT` sama + cek 5 sample ID.
- SQLite lama jangan dihapus H+7. Backup `auth.db` dulu. Gagal = ulangi, tidak lanjut.
- Auth tidak dipindah.
- Verifikasi: COUNT kiri-kanan sama, sample cocok, down+up data tetap ada.
- Keputusan: bang rob, 26-09-2026, Rp0.
