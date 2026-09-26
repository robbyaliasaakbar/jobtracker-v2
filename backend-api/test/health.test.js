'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Test tanpa DB: health, CORS preflight, dan satpam token (401).
// AUTH_URL diarahkan ke stub lokal supaya deterministik (tidak peduli :7002 hidup/mati).

let stub;
let server;
let port;

before(async () => {
  stub = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/me' && req.headers.authorization === 'Bearer token-sah') {
      res.end(JSON.stringify({ email: 'tester@contoh.id', nama: 'Tester' }));
    } else {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Token tidak sah atau kedaluwarsa' }));
    }
  });
  await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
  // Set env SEBELUM require config/app (config baca env saat require pertama).
  process.env.AUTH_URL = `http://127.0.0.1:${stub.address().port}`;
  process.env.DATABASE_URL = '';
  process.env.DB_NAME = '';

  const { createApp } = require('../src/app');
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => stub.close(resolve));
});

const url = (p) => `http://127.0.0.1:${port}${p}`;

test('GET /health -> 200 {ok:true}', async () => {
  const r = await fetch(url('/health'));
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { ok: true });
});

test('GET /api/health -> 200 (paritas dengan backend lama)', async () => {
  const r = await fetch(url('/api/health'));
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { ok: true });
});

test('/api/lamaran tanpa token -> 401', async () => {
  const r = await fetch(url('/api/lamaran'));
  assert.strictEqual(r.status, 401);
  assert.match((await r.json()).error, /Token/);
});

test('/api/lamaran token mati -> 401', async () => {
  const r = await fetch(url('/api/lamaran'), { headers: { Authorization: 'Bearer kadaluarsa' } });
  assert.strictEqual(r.status, 401);
});

test('preflight OPTIONS dari origin terdaftar -> 204 + CORS', async () => {
  const r = await fetch(url('/api/lamaran'), {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:7013', 'Access-Control-Request-Method': 'POST' },
  });
  assert.strictEqual(r.status, 204);
  assert.strictEqual(r.headers.get('access-control-allow-origin'), 'http://localhost:7013');
});

test('origin asing tidak dapet CORS header', async () => {
  const r = await fetch(url('/health'), { headers: { Origin: 'https://jahat.example' } });
  assert.strictEqual(r.headers.get('access-control-allow-origin'), null);
});

test('rute ngawur -> 404 JSON', async () => {
  const r = await fetch(url('/api/kambing'));
  assert.strictEqual(r.status, 404);
  assert.deepStrictEqual(await r.json(), { error: 'Not found' });
});
