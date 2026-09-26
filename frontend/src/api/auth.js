// Auth — SEMUA ke auth pusat FROZEN (:7002 / suffix /auth di belakang Caddy).
// Endpoint persis seperti FE lama: register, verify, login, forgot, reset, me.

import { AUTH_BASE } from './config.js';
import { request, setToken, clearToken, getToken } from './http.js';

const post = (path, body) => request(AUTH_BASE, path, { method: 'POST', body });

export async function login({ email, password }) {
  const data = await post('/api/login', { email, password });
  setToken(data.token);
  return data.user;
}

export async function register(payload) {
  return post('/api/register', payload); // balikin {message, cek} -> lanjut OTP
}

export async function verify({ email, kode }) {
  const data = await post('/api/verify', { email, kode });
  setToken(data.token);
  return data.user;
}

export const forgot = (email) => post('/api/forgot', { email });
export const reset = (payload) => post('/api/reset', payload);

export async function me() {
  const data = await request(AUTH_BASE, '/api/me', { auth: true });
  return { email: data.email, nama: data.nama || '' };
}

export { clearToken, setToken, getToken };
