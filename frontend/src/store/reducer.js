// Reducer murni — semua perubahan state lewat sini, gampang ditest.
// Bentuk state: lihat initialState.

export const initialState = {
  status: 'checking', // 'checking' | 'guest' | 'offline' | 'ready'
  user: null, // {email, nama}
  offlineMessage: '',
  lamaran: [],
  listError: '', // pesan kalau API lamaran tidak terjangkau
  toasts: [], // [{id, text, kind}] kind: 'ok' | 'error'
};

// Urut: tanggal terbaru dulu, tanggal kosong di bawah (paritas SQL NULLS LAST),
// id terbesar dulu buat tanggal sama.
export function urutTerbaru(rows) {
  return [...rows].sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (!da && !db) return Number(b.id) - Number(a.id);
    if (!da) return 1;
    if (!db) return -1;
    if (da === db) return Number(b.id) - Number(a.id);
    return da < db ? 1 : -1;
  });
}

export function reducer(state, action) {
  switch (action.type) {
    case 'auth/checking':
      return { ...state, status: 'checking' };
    case 'auth/guest':
      return { ...initialState, status: 'guest' };
    case 'auth/offline':
      return { ...state, status: 'offline', offlineMessage: action.message || '' };
    case 'auth/ready':
      return { ...state, status: 'ready', user: action.user, offlineMessage: '', listError: '' };
    case 'auth/logout':
      return { ...initialState, status: 'guest' };
    case 'list/loaded':
      return { ...state, lamaran: urutTerbaru(action.data || []), listError: '' };
    case 'list/error':
      return { ...state, listError: action.message || 'Data tidak bisa dimuat.' };
    case 'list/clear-error':
      return { ...state, listError: '' };
    case 'list/upsert': {
      const lain = state.lamaran.filter((x) => String(x.id) !== String(action.row.id));
      return { ...state, lamaran: urutTerbaru([...lain, action.row]), listError: '' };
    }
    case 'list/remove':
      return { ...state, lamaran: state.lamaran.filter((x) => String(x.id) !== String(action.id)) };
    case 'toast/push':
      return { ...state, toasts: [...state.toasts, { id: action.id, text: action.text, kind: action.kind || 'ok' }] };
    case 'toast/pop':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}
