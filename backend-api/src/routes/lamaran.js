'use strict';
const express = require('express');
const { getDb } = require('../db');
const { bersihkan, idValid } = require('../validate');
const { verifikasiToken } = require('../auth');

const router = express.Router();
const LIMIT = 500;

// Semua rute di bawah ini butuh token sah (email dari GET /api/me auth pusat).
router.use(verifikasiToken);

// DATE Postgres bisa balik Date atau string — samakan jangan-jangan yyyy-mm-dd.
function tgl(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// Bentuk baris IDENTIK dengan backend lama (lamaran_row di lamaran.php).
function baris(r) {
  let createdAt = '';
  if (r.created_at) {
    const d = r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
  }
  return {
    id: String(r.id),
    company: r.company || '',
    position: r.position || '',
    date: tgl(r.tanggal),
    status: r.status || 'baru',
    portal: r.portal || '',
    link: r.link || '',
    createdAt,
  };
}

function tangkap(next) {
  return (e) => next(e);
}

// GET /api/lamaran — list milik sendiri, tanggal terbaru dulu (NULL paling bawah).
router.get('/', (req, res, next) => {
  getDb()('lamaran')
    .where({ email: req.userEmail })
    .orderByRaw('tanggal DESC NULLS LAST')
    .orderBy('id', 'desc')
    .limit(LIMIT)
    .then((rows) => res.json({ data: rows.map(baris) }))
    .catch(tangkap(next));
});

// POST /api/lamaran — tambah 1 milik sendiri.
router.post('/', (req, res, next) => {
  const hasil = bersihkan(req.body || {});
  if (hasil.error) return res.status(422).json({ error: hasil.error });
  getDb()('lamaran')
    .insert({ email: req.userEmail, ...hasil.value })
    .returning('*')
    .then(([row]) => res.status(201).json(baris(row)))
    .catch(tangkap(next));
});

// PUT /api/lamaran/:id — edit milik sendiri.
router.put('/:id', (req, res, next) => {
  if (!idValid(req.params.id)) return res.status(404).json({ error: 'Data tidak ditemukan' });
  const hasil = bersihkan(req.body || {});
  if (hasil.error) return res.status(422).json({ error: hasil.error });
  getDb()('lamaran')
    .where({ id: Number(req.params.id), email: req.userEmail })
    .update({ ...hasil.value, updated_at: getDb().fn.now() })
    .returning('*')
    .then((rows) => {
      if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });
      return res.json(baris(rows[0]));
    })
    .catch(tangkap(next));
});

// DELETE /api/lamaran/:id — hapus milik sendiri.
router.delete('/:id', (req, res, next) => {
  if (!idValid(req.params.id)) return res.status(404).json({ error: 'Data tidak ditemukan' });
  getDb()('lamaran')
    .where({ id: Number(req.params.id), email: req.userEmail })
    .del()
    .then((n) => {
      if (!n) return res.status(404).json({ error: 'Data tidak ditemukan' });
      return res.json({ ok: true });
    })
    .catch(tangkap(next));
});

module.exports = router;
