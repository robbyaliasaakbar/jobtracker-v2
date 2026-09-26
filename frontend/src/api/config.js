// Basis URL. Dev (tanpa .env): ikut hostname browser, port auth 7002 / API 7012
// (pola yang sama dengan FE lama). Produksi: di-set di .env.production (funnel Caddy).

const origin = () =>
  typeof location !== 'undefined' ? `${location.protocol}//${location.hostname}` : 'http://localhost';

const bersih = (v) => (v || '').replace(/\/+$/, '');

export const AUTH_BASE = bersih(import.meta.env.VITE_AUTH_URL) || `${origin()}:7002`;
export const API_BASE = bersih(import.meta.env.VITE_API_URL) || `${origin()}:7012`;
