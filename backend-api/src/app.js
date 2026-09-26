'use strict';
const express = require('express');
const config = require('./config');
const lamaranRouter = require('./routes/lamaran');

// CORS: origin eksplisit (ALLOWED_ORIGIN) ATAU origin se-mesin (host == host request).
// Pola yang sama dengan backend auth PHP — aman dari situs asing, tanpa buka lebar.
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin || '';
  if (origin) {
    let boleh = config.allowedOrigins.includes(origin);
    if (!boleh) {
      try {
        const hostAsal = new URL(origin).hostname;
        const hostTuju = (req.headers.host || '').split(':')[0];
        boleh = Boolean(hostAsal) && hostAsal === hostTuju;
      } catch {
        boleh = false;
      }
    }
    if (boleh) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
}

// Log satu baris JSON per request (Tier B: log JSON, enak dibaca container log).
function logJson(req, res, next) {
  const t0 = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - t0,
    }));
  });
  next();
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use(corsMiddleware);
  app.use(logJson);

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/lamaran', lamaranRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Body bukan JSON yang valid' });
    }
    console.error(JSON.stringify({ ts: new Date().toISOString(), error: err.message, path: req.originalUrl }));
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  });

  return app;
}

module.exports = { createApp };
