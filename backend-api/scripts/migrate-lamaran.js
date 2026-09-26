'use strict';
// Cutover sekali jalan: SQLite auth.db (READ-ONLY) -> Postgres jobtracker_v2.
//
// FLAG KERAS (PRD D3): auth.db FROZEN.
//   - auth.db tidak pernah dibuka untuk ditulis. Dibaca dari file BACKUP segar.
//   - Tulis HANYA ke Postgres (tabel lamaran).
//   - Verifikasi wajib lolos: COUNT sumber == COUNT target + 5 sample cocok.
//   - Gagal = ulangi, tidak lanjut.
//
// Pemakaian:
//   SQLITE_PATH=/path/ke/auth.db npm run cutover   (atau isi SQLITE_PATH di .env)

const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
require('../src/pgtypes'); // DATE -> string mentah (biar sample tidak meleset)
const knexLib = require('knex');
const config = require('../src/config');

function gagal(pesan) {
  console.error('GAGAL: ' + pesan);
  process.exit(1);
}

// Signature baris biar idempoten: diulang tidak dobel-insert.
const sig = (r) => [r.email || '', r.company || '', r.position || '', r.tanggal || ''].join('|').toLowerCase();

// Timestamp ISO dari SQLite boleh dimasukkan ke TIMESTAMPTZ, kalau tidak bisa
// diparse biarin kosong (kolom punya default now()).
function tsOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function main() {
  const sqlitePath = process.env.SQLITE_PATH;
  if (!sqlitePath) gagal('SQLITE_PATH belum diisi (path ke auth.db)');
  if (!config.databaseUrl) gagal('DATABASE_URL / DB_* belum diisi');
  if (!fs.existsSync(sqlitePath)) gagal('File tidak ditemukan: ' + sqlitePath);

  // 1. Backup dulu (PRD D3) — file baru, auth.db asli tidak disentuh.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backup = `${sqlitePath}.bak-cutover-${stamp}`;
  fs.copyFileSync(sqlitePath, backup);
  console.log('backup  : ' + backup);

  // 2. Baca dari BACKUP secara read-only.
  const src = new DatabaseSync(backup, { readOnly: true });
  const rows = src
    .prepare('SELECT id, email, company, position, tanggal, status, portal, link, created_at, updated_at FROM lamaran ORDER BY id')
    .all();
  src.close();
  console.log(`sumber  : ${rows.length} baris (SQLite)`);

  // 3. Target: pastikan skema ada (migration 001).
  const db = knexLib({ client: 'pg', connection: config.databaseUrl });
  await db.migrate.latest();

  const targetSebelum = await db('lamaran').select('*');
  const sigTarget = new Set(targetSebelum.map(sig));
  const targetId = new Set(targetSebelum.map((r) => Number(r.id)));
  const fresh = targetSebelum.length === 0;

  // 4. Insert baris yang belum ada. ID dipertahankan biar link lama tetap hidup.
  const belum = rows.filter((r) => !sigTarget.has(sig(r)));
  let denganId = 0;
  let tanpaId = 0;
  for (const r of belum) {
    const nilai = {
      id: Number(r.id),
      email: r.email,
      company: r.company || '',
      position: r.position || '',
      tanggal: r.tanggal || null,
      status: r.status || 'baru',
      portal: r.portal || '',
      link: r.link || '',
      created_at: tsOrNull(r.created_at),
      updated_at: tsOrNull(r.updated_at),
    };
    if (targetId.has(nilai.id)) {
      delete nilai.id; // id sudah terpakai beda baris — biar serial yang ngatur
      tanpaId += 1;
    } else {
      denganId += 1;
    }
    await db('lamaran').insert(nilai);
    targetId.add(nilai.id);
    sigTarget.add(sig(r));
  }
  console.log(`insert  : ${belum.length} baris (${denganId} id asli, ${tanpaId} id baru)`);

  // Serial sequence ikut disamakan (wajib kalau id eksplisit dipakai).
  if (fresh && rows.length) {
    await db.raw(
      "SELECT setval(pg_get_serial_sequence('lamaran', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM lamaran), 1))"
    );
  }

  // 5. Verifikasi: COUNT sumber == COUNT target, semua signature sumber ada.
  const sesudah = await db('lamaran').select('*');
  const sigSesudah = new Set(sesudah.map(sig));
  const hilang = rows.filter((r) => !sigSesudah.has(sig(r)));
  console.log(`target  : ${sesudah.length} baris (Postgres)`);
  if (sesudah.length !== rows.length || hilang.length > 0) {
    console.error(`COUNT sumber=${rows.length} target=${sesudah.length} hilang=${hilang.length}`);
    await db.destroy();
    gagal('Verifikasi COUNT gagal. Perbaiki lalu ulangi. Data SQLite tetap aman.');
  }

  // 6. Cek 5 sample: field harus identik dengan sumber.
  const sample = rows.filter((_, i) => i % Math.max(1, Math.ceil(rows.length / 5)) === 0).slice(0, 5);
  for (const s of sample) {
    const t = sesudah.find((r) => sig(r) === sig(s));
    const sama =
      t &&
      (t.company || '') === (s.company || '') &&
      (t.position || '') === (s.position || '') &&
      (t.status || '') === (s.status || '') &&
      (t.portal || '') === (s.portal || '') &&
      (t.link || '') === (s.link || '') &&
      String(t.tanggal || '').slice(0, 10) === String(s.tanggal || '').slice(0, 10);
    if (!sama) {
      await db.destroy();
      gagal(`Sample id=${s.id} tidak cocok. Periksa lalu ulangi.`);
    }
    console.log(`sample  : id=${s.id} "${s.company}" OK`);
  }

  console.log(`SELESAI: ${rows.length} baris pindah, COUNT cocok, sample cocok.`);
  console.log('Catatan: auth.db lama JANGAN dihapus minimal H+7 (PRD D3).');
  await db.destroy();
}

main().catch((e) => {
  console.error('GAGAL: ' + e.message);
  process.exit(1);
});
