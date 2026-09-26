'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const knexLib = require('knex');
const config = require('../src/config');

// Test integrasi penuh: stub auth + Postgres test (turunan <DB_NAME>_test atau
// TEST_DATABASE_URL). Kalau keduanya kosong (mis. CI tanpa service), test di-skip.

const TEST_URL = config.testDatabaseUrl;
const EMAIL = 'integration-test@jobtracker.local';
const EMAIL_LAIN = 'tetangga@jobtracker.local';

let stub;
let server;
let port;
let getDb;
let closeDb;

async function ensureTestDb(url) {
  const u = new URL(url);
  const admin = knexLib({
    client: 'pg',
    connection: {
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: 'postgres',
    },
  });
  const nama = decodeURIComponent(u.pathname.slice(1));
  const ada = await admin.raw('SELECT 1 FROM pg_database WHERE datname = ?', [nama]);
  if (!ada.rows.length) await admin.raw(`CREATE DATABASE "${nama}"`);
  await admin.destroy();
}

before(async () => {
  if (!TEST_URL) return;
  stub = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/me' && req.headers.authorization === 'Bearer token-integrasi') {
      res.end(JSON.stringify({ email: EMAIL }));
    } else {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Token tidak sah atau kedaluwarsa' }));
    }
  });
  await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));

  config.authUrl = `http://127.0.0.1:${stub.address().port}`;
  config.databaseUrl = TEST_URL; // getDb() baca config saat pertama dipanggil
  await ensureTestDb(TEST_URL);

  const db = require('../src/db');
  getDb = db.getDb;
  closeDb = db.closeDb;
  await db.runMigrations();
  await getDb()('lamaran').whereIn('email', [EMAIL, EMAIL_LAIN]).del();

  const { createApp } = require('../src/app');
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  port = server.address().port;
});

after(async () => {
  if (!TEST_URL) return;
  await getDb()('lamaran').whereIn('email', [EMAIL, EMAIL_LAIN]).del().catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
  if (stub) await new Promise((resolve) => stub.close(resolve));
  await closeDb();
});

const url = (p) => `http://127.0.0.1:${port}${p}`;
const api = (p, opt = {}) =>
  fetch(url(p), {
    ...opt,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-integrasi', ...(opt.headers || {}) },
  });

test('alur CRUD lamaran + isolasi antar pemilik', { skip: !TEST_URL, timeout: 60000 }, async () => {
  // 1. Tambah
  let r = await api('/api/lamaran', {
    method: 'POST',
    body: JSON.stringify({
      company: 'PT Uji Coba',
      position: 'Backend Engineer',
      date: '2026-09-26',
      status: 'interview-hr',
      portal: 'LinkedIn',
      link: 'jobstreet.com/123',
    }),
  });
  assert.strictEqual(r.status, 201);
  const dibuat = await r.json();
  assert.strictEqual(dibuat.company, 'PT Uji Coba');
  assert.strictEqual(dibuat.date, '2026-09-26');
  assert.strictEqual(dibuat.link, 'https://jobstreet.com/123'); // auto https://
  assert.strictEqual(typeof dibuat.id, 'string'); // paritas bentuk lama

  // 2. List hanya milik sendiri
  r = await api('/api/lamaran');
  assert.strictEqual(r.status, 200);
  const list = (await r.json()).data;
  assert.ok(list.some((x) => x.id === dibuat.id));

  // 3. Baris milik orang lain disuntik langsung ke DB — tidak boleh terlihat.
  const db = getDb();
  const [asing] = await db('lamaran')
    .insert({ email: EMAIL_LAIN, company: 'PT Tetangga', position: 'QA', status: 'baru' })
    .returning('*');
  r = await api('/api/lamaran');
  const list2 = (await r.json()).data;
  assert.ok(!list2.some((x) => x.id === String(asing.id)), 'data orang lain bocor ke list');

  // 4. Edit milik sendiri
  r = await api(`/api/lamaran/${dibuat.id}`, {
    method: 'PUT',
    body: JSON.stringify({ company: 'PT Uji Coba', position: 'Senior Backend', date: '2026-09-27', status: 'technical-test', portal: 'LinkedIn', link: 'https://jobstreet.com/123' }),
  });
  assert.strictEqual(r.status, 200);
  const diedit = await r.json();
  assert.strictEqual(diedit.position, 'Senior Backend');
  assert.strictEqual(diedit.status, 'technical-test');

  // 5. Edit baris orang lain -> 404 (anti intip)
  r = await api(`/api/lamaran/${asing.id}`, {
    method: 'PUT',
    body: JSON.stringify({ company: 'X', position: 'Y' }),
  });
  assert.strictEqual(r.status, 404);

  // 6. Validasi ditolak -> 422
  r = await api('/api/lamaran', { method: 'POST', body: JSON.stringify({ company: 'Tanpa Posisi' }) });
  assert.strictEqual(r.status, 422);

  // 7. Hapus milik sendiri
  r = await api(`/api/lamaran/${dibuat.id}`, { method: 'DELETE' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { ok: true });

  r = await api(`/api/lamaran/${dibuat.id}`, { method: 'DELETE' });
  assert.strictEqual(r.status, 404); // sudah hilang

  // Bersihkan baris tetangga
  await db('lamaran').where({ id: asing.id }).del();
});

test('tanpa token -> 401 (satpam jalan di atas DB)', { skip: !TEST_URL }, async () => {
  const r = await fetch(url('/api/lamaran'));
  assert.strictEqual(r.status, 401);
});
