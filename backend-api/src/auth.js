'use strict';
const config = require('./config');

// Satpam: token diperiksa ke auth pusat FROZEN (:7002) lewat GET /api/me.
// CUMA baca — tidak pernah menulis ke auth. Balikin email pemilik kalau sah.
async function verifikasiToken(req, res, next) {
  const header = req.headers.authorization || '';
  if (!/^Bearer\s+\S+$/.test(header)) {
    return res.status(401).json({ error: 'Token tidak sah atau kedaluwarsa' });
  }
  try {
    const r = await fetch(config.authUrl + '/api/me', {
      headers: { Authorization: header },
      signal: AbortSignal.timeout(config.authTimeoutMs),
    });
    if (!r.ok) return res.status(401).json({ error: 'Token tidak sah atau kedaluwarsa' });
    const body = await r.json().catch(() => null);
    if (!body || !body.email) return res.status(401).json({ error: 'Token tidak sah atau kedaluwarsa' });
    req.userEmail = String(body.email);
    return next();
  } catch {
    // Auth tidak terjangkau: jangan pura-pura sah, jangan juga 401 (bukan salah user).
    return res.status(503).json({ error: 'Layanan login sedang tidak terjangkau. Coba lagi nanti.' });
  }
}

module.exports = { verifikasiToken };
