// Token & pembungkus fetch. Key localStorage sama dengan FE lama
// (jobTracker.token) supaya sesi lama tetap kepakai.

const TOKEN_KEY = 'jobTracker.token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage diblokir — biarin */
  }
};

export class ApiError extends Error {
  constructor(message, status, kind) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // kind: 'network' (server mati) | 'unauthorized' | 'api' (4xx/5xx dari server)
    this.kind = kind;
  }
}

// telepon server. Balas JSON atau lempar ApiError dengan pesan netral.
export async function request(base, path, { method = 'GET', body, auth = false } = {}) {
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Server tidak terjangkau. Coba lagi nanti.', 0, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const kind = res.status === 401 ? 'unauthorized' : 'api';
    throw new ApiError(data.error || `Gagal (kode ${res.status})`, res.status, kind);
  }
  return data;
}
