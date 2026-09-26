'use strict';
// Validasi lamaran — aturan identik dengan backend lama (lamaran.php)
// supaya data lama dan baru bisa campur tanpa drama.

const STATUS = ['baru', 'interview-hr', 'technical-test', 'interview-user', 'offering', 'diterima', 'ditolak'];

// Return { value } kalau bersih, atau { error } kalau jebol.
function bersihkan(input = {}) {
  const company = String(input.company ?? '').trim();
  const position = String(input.position ?? '').trim();
  const tanggal = String(input.date ?? input.tanggal ?? '').trim();
  const status = String(input.status ?? '').trim() || 'baru';
  const portal = String(input.portal ?? '').trim();
  let link = String(input.link ?? '').trim();

  if (!company || !position) return { error: 'Perusahaan dan posisi wajib diisi' };
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal harus format yyyy-mm-dd' };
  if (!STATUS.includes(status)) return { error: 'Status tidak dikenal' };
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;

  return { value: { company, position, tanggal: tanggal || null, status, portal, link } };
}

// ID harus digit (paranoid, sama kayak ctype_digit di PHP lama).
function idValid(id) {
  return /^\d+$/.test(String(id));
}

module.exports = { STATUS, bersihkan, idValid };
