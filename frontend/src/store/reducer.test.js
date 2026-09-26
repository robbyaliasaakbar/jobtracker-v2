import { describe, test, expect } from 'vitest';
import { reducer, initialState, urutTerbaru } from './reducer.js';

const baris = (id, date) => ({ id: String(id), date, company: 'PT', position: 'Dev', status: 'baru' });

describe('urutTerbaru', () => {
  test('tanggal terbaru di atas', () => {
    const out = urutTerbaru([baris(1, '2026-01-01'), baris(2, '2026-09-26')]);
    expect(out.map((x) => x.id)).toEqual(['2', '1']);
  });

  test('tanggal kosong jatuh ke bawah (paritas SQL NULLS LAST)', () => {
    const out = urutTerbaru([baris(1, ''), baris(2, '2026-01-01'), baris(3, '')]);
    expect(out.map((x) => x.id)).toEqual(['2', '3', '1']);
  });

  test('tanggal sama -> id terbesar dulu', () => {
    const out = urutTerbaru([baris(4, '2026-09-26'), baris(9, '2026-09-26')]);
    expect(out.map((x) => x.id)).toEqual(['9', '4']);
  });

  test('tidak mengubah array asli', () => {
    const asli = [baris(1, '2026-01-01'), baris(2, '2026-09-26')];
    urutTerbaru(asli);
    expect(asli.map((x) => x.id)).toEqual(['1', '2']);
  });
});

describe('reducer auth', () => {
  test('guest mengosongkan state', () => {
    const s = reducer({ ...initialState, user: { email: 'a@b.id' }, lamaran: [baris(1, '')] }, { type: 'auth/guest' });
    expect(s.status).toBe('guest');
    expect(s.user).toBeNull();
    expect(s.lamaran).toEqual([]);
  });

  test('logout balik ke guest bersih', () => {
    const s = reducer({ ...initialState, status: 'ready', user: { email: 'a@b.id' } }, { type: 'auth/logout' });
    expect(s.status).toBe('guest');
  });

  test('offline menyimpan pesan, tidak membuang sesi', () => {
    const s = reducer({ ...initialState, status: 'ready', lamaran: [baris(1, '')] }, { type: 'auth/offline', message: 'tidur' });
    expect(s.status).toBe('offline');
    expect(s.offlineMessage).toBe('tidur');
  });
});

describe('reducer list', () => {
  test('loaded selalu terurut', () => {
    const s = reducer(initialState, { type: 'list/loaded', data: [baris(1, '2026-01-01'), baris(2, '2026-09-26')] });
    expect(s.lamaran.map((x) => x.id)).toEqual(['2', '1']);
    expect(s.listError).toBe('');
  });

  test('upsert menambah baris baru', () => {
    const s = reducer(initialState, { type: 'list/loaded', data: [baris(1, '2026-09-26')] });
    const s2 = reducer(s, { type: 'list/upsert', row: baris(2, '2026-09-25') });
    expect(s2.lamaran).toHaveLength(2);
  });

  test('upsert mengganti baris dengan id sama (tidak dobel)', () => {
    const s = reducer(initialState, { type: 'list/loaded', data: [baris(1, '2026-09-26')] });
    const s2 = reducer(s, { type: 'list/upsert', row: { ...baris(1, '2026-09-26'), company: 'Diganti' } });
    expect(s2.lamaran).toHaveLength(1);
    expect(s2.lamaran[0].company).toBe('Diganti');
  });

  test('remove membuang baris by id (string/number sama)', () => {
    const s = reducer(initialState, { type: 'list/loaded', data: [baris(1, '2026-09-26'), baris(2, '2026-09-25')] });
    const s2 = reducer(s, { type: 'list/remove', id: 1 });
    expect(s2.lamaran.map((x) => x.id)).toEqual(['2']);
  });
});

describe('reducer toast', () => {
  test('push lalu pop', () => {
    let s = reducer(initialState, { type: 'toast/push', id: 7, text: 'Tersimpan.' });
    expect(s.toasts).toEqual([{ id: 7, text: 'Tersimpan.', kind: 'ok' }]);
    s = reducer(s, { type: 'toast/pop', id: 7 });
    expect(s.toasts).toEqual([]);
  });

  test('toast error memakai kind error', () => {
    const s = reducer(initialState, { type: 'toast/push', id: 1, text: 'Gagal', kind: 'error' });
    expect(s.toasts[0].kind).toBe('error');
  });
});
