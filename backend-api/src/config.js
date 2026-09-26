'use strict';
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// DATABASE_URL menang kalau di-set (CI/test). Selain itu rakit dari DB_*.
function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  if (DB_USER && DB_NAME) {
    return `postgres://${DB_USER}:${DB_PASSWORD || ''}@${DB_HOST || 'localhost'}:${DB_PORT || '5432'}/${DB_NAME}`;
  }
  return '';
}

// DB test turunan: <nama-db>_test, biar data produksi tidak tersentuh test.
function buildTestDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = buildDatabaseUrl();
  if (!base || !process.env.DB_NAME) return '';
  return base.replace(/\/([^/?]+)([?].*)?$/, (m, name, q) => `/${name}_test${q || ''}`);
}

const config = {
  port: Number(process.env.PORT || 7012),
  databaseUrl: buildDatabaseUrl(),
  testDatabaseUrl: buildTestDatabaseUrl(),
  authUrl: (process.env.AUTH_URL || 'http://127.0.0.1:7002').replace(/\/+$/, ''),
  allowedOrigins: (process.env.ALLOWED_ORIGIN || 'http://localhost:7013,http://127.0.0.1:7013')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  authTimeoutMs: Number(process.env.AUTH_TIMEOUT_MS || 4000),
};

module.exports = config;
