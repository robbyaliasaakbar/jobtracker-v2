import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { reducer, initialState } from './reducer.js';
import * as authApi from '../api/auth.js';
import * as lamaranApi from '../api/lamaran.js';

const StoreCtx = createContext(null);

export function AppStore({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastSeq = useRef(0);

  const toast = (text, kind = 'ok') => {
    const id = ++toastSeq.current;
    dispatch({ type: 'toast/push', id, text, kind });
    setTimeout(() => dispatch({ type: 'toast/pop', id }), 3600);
  };

  const muatList = async () => {
    try {
      const data = await lamaranApi.list();
      dispatch({ type: 'list/loaded', data });
    } catch (e) {
      if (e.kind === 'unauthorized') return keluar();
      dispatch({ type: 'list/error', message: e.message });
    }
  };

  // Bootstrap pas halaman dibuka: cek kartu (GET /api/me) ke auth pusat.
  const bootstrap = async () => {
    dispatch({ type: 'auth/checking' });
    if (!authApi.getToken()) return dispatch({ type: 'auth/guest' });
    try {
      const user = await authApi.me();
      dispatch({ type: 'auth/ready', user });
      await muatList();
    } catch (e) {
      if (e.kind === 'unauthorized') {
        authApi.clearToken();
        return dispatch({ type: 'auth/guest' });
      }
      // Auth tidak terjangkau (PC lagi tidur) — jangan buang sesi user.
      return dispatch({ type: 'auth/offline', message: e.message });
    }
    return undefined;
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const keluar = () => {
    authApi.clearToken();
    dispatch({ type: 'auth/logout' });
  };

  const aksi = {
    toast,
    bootstrap,
    muatList,
    keluar,

    async login(payload) {
      const user = await authApi.login(payload);
      dispatch({ type: 'auth/ready', user });
      await muatList();
      return user;
    },
    register: (payload) => authApi.register(payload),
    async verify(payload) {
      const user = await authApi.verify(payload);
      dispatch({ type: 'auth/ready', user });
      await muatList();
      return user;
    },
    forgot: (email) => authApi.forgot(email),
    reset: (payload) => authApi.reset(payload),

    async tambah(payload) {
      const row = await lamaranApi.create(payload);
      dispatch({ type: 'list/upsert', row });
      return row;
    },
    async ubah(id, payload) {
      const row = await lamaranApi.update(id, payload);
      dispatch({ type: 'list/upsert', row });
      return row;
    },
    async hapus(id) {
      await lamaranApi.remove(id);
      dispatch({ type: 'list/remove', id });
    },
    popToast: (id) => dispatch({ type: 'toast/pop', id }),
    async cobaLagi() {
      dispatch({ type: 'auth/checking' });
      await bootstrap();
    },
  };

  return <StoreCtx.Provider value={{ state, ...aksi }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore dipakai di luar <AppStore>');
  return ctx;
}
