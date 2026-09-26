// Lamaran — semua ke BE baru :7012 (atau /api via Caddy). Butuh token.

import { API_BASE } from './config.js';
import { request } from './http.js';

const opt = (method, body) => ({ method, body, auth: true });

export async function list() {
  const data = await request(API_BASE, '/api/lamaran', opt('GET'));
  return data.data || [];
}

export const create = (body) => request(API_BASE, '/api/lamaran', opt('POST', body));
export const update = (id, body) =>
  request(API_BASE, `/api/lamaran/${encodeURIComponent(id)}`, opt('PUT', body));
export const remove = (id) =>
  request(API_BASE, `/api/lamaran/${encodeURIComponent(id)}`, opt('DELETE'));
