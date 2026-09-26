'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { bersihkan, idValid, STATUS } = require('../src/validate');

test('input bersih: default status baru, tanggal null kalau kosong', () => {
  const h = bersihkan({ company: '  PT Maju  ', position: ' Developer ' });
  assert.strictEqual(h.error, undefined);
  assert.deepStrictEqual(h.value, {
    company: 'PT Maju',
    position: 'Developer',
    tanggal: null,
    status: 'baru',
    portal: '',
    link: '',
  });
});

test('wajib: company dan position kosong ditolak', () => {
  assert.match(bersihkan({ position: 'Dev' }).error, /wajib/);
  assert.match(bersihkan({ company: 'PT' }).error, /wajib/);
  assert.match(bersihkan({}).error, /wajib/);
});

test('tanggal: format yyyy-mm-dd saja', () => {
  assert.strictEqual(bersihkan({ company: 'A', position: 'B', date: '2026-09-26' }).value.tanggal, '2026-09-26');
  assert.match(bersihkan({ company: 'A', position: 'B', date: '26-09-2026' }).error, /yyyy-mm-dd/);
});

test('status: enum lama dipertahankan, selain itu ditolak', () => {
  assert.strictEqual(STATUS.length, 7);
  assert.strictEqual(bersihkan({ company: 'A', position: 'B', status: 'diterima' }).value.status, 'diterima');
  assert.match(bersihkan({ company: 'A', position: 'B', status: 'ngawur' }).error, /tidak dikenal/);
});

test('link: tanpa protokol otomatis ditempel https://', () => {
  assert.strictEqual(bersihkan({ company: 'A', position: 'B', link: 'jobstreet.com/1' }).value.link, 'https://jobstreet.com/1');
  assert.strictEqual(bersihkan({ company: 'A', position: 'B', link: 'http://x.id' }).value.link, 'http://x.id');
});

test('field lama: date alias diterima seperti PHP (input.date atau input.tanggal)', () => {
  assert.strictEqual(bersihkan({ company: 'A', position: 'B', tanggal: '2026-01-02' }).value.tanggal, '2026-01-02');
});

test('idValid: cuma digit', () => {
  assert.strictEqual(idValid('123'), true);
  assert.strictEqual(idValid("1 OR 1=1"), false);
  assert.strictEqual(idValid('abc'), false);
  assert.strictEqual(idValid(''), false);
});
