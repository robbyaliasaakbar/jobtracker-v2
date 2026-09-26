import { useState } from 'react';
import { useStore } from '../store/AppStore.jsx';
import { DoubleRule } from '../components/ui.jsx';
import { AuthFields } from '../components/AuthFields.jsx';
import { SampleLedger } from '../components/SampleLedger.jsx';

const JUDUL = {
  login: ['Masuk', 'Lanjutkan buku besar lamaranmu.'],
  daftar: ['Daftar', 'Buat akun, cek kode di email, selesai.'],
  otp: ['Cek email', 'Masukkan 6 digit kode yang kami kirim.'],
  lupa: ['Lupa password', 'Kami kirim kode reset kalau email terdaftar.'],
  reset: ['Password baru', 'Masukkan kode reset dan password baru.'],
};

const TOMBOL = {
  login: 'masuk',
  daftar: 'daftar',
  otp: 'verifikasi kode',
  lupa: 'kirim kode reset',
  reset: 'ganti password',
};

const SWITCH = {
  login: [
    ['Belum punya akun? Daftar', 'daftar'],
    ['Lupa password?', 'lupa'],
  ],
  daftar: [['Sudah punya akun? Masuk', 'login']],
  otp: [['Batal, kembali masuk', 'login']],
  lupa: [['Ingat password? Masuk', 'login']],
  reset: [['Kembali masuk', 'login']],
};

function KotakPesan({ teks, jenis }) {
  if (!teks) return null;
  return (
    <p
      role={jenis === 'error' ? 'alert' : 'status'}
      className={`px-3 py-2 font-mono text-xs border-l-2 ${
        jenis === 'error' ? 'border-stamp bg-stamp/10' : 'border-moss bg-moss/10'
      }`}
    >
      {teks}
    </p>
  );
}

export function AuthPage() {
  const { login, register, verify, forgot, reset } = useStore();
  const [mode, setMode] = useState('login');
  const [v, setV] = useState({});
  const [pesan, setPesan] = useState(null); // {teks, jenis}
  const [sibuk, setSibuk] = useState(false);

  const set = (k) => (e) => setV((old) => ({ ...old, [k]: e.target.value }));
  const ke = (m) => {
    setMode(m);
    setV({});
    setPesan(null);
  };

  async function kirim(e) {
    e.preventDefault();
    setPesan(null);
    setSibuk(true);
    try {
      if (mode === 'login') {
        await login({ email: v.email, password: v.password });
        // App otomatis pindah ke dashboard (state 'ready').
      } else if (mode === 'daftar') {
        if (v.password !== v.konfirmasi) throw new Error('Konfirmasi password tidak sama');
        const r = await register({
          email: v.email,
          password: v.password,
          password_konfirmasi: v.konfirmasi,
          nama: v.nama || '',
          telepon: v.telepon || '',
        });
        setPesan({ teks: r.message || 'Kode sudah dikirim. Cek email kamu.', jenis: 'ok' });
        setMode('otp');
      } else if (mode === 'otp') {
        await verify({ email: v.email, kode: v.kode });
      } else if (mode === 'lupa') {
        const r = await forgot(v.email);
        setPesan({ teks: r.message || 'Kode reset dikirim (kalau email terdaftar).', jenis: 'ok' });
        setMode('reset');
      } else if (mode === 'reset') {
        await reset({ email: v.email, kode: v.kode, password_baru: v.passwordBaru });
        ke('login');
        setPesan({ teks: 'Password diganti. Silakan masuk.', jenis: 'ok' });
      }
    } catch (err) {
      setPesan({ teks: err.message || 'Gagal. Coba lagi.', jenis: 'error' });
    } finally {
      setSibuk(false);
    }
  }

  const [judul, sub] = JUDUL[mode];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <main className="px-6 sm:px-10 lg:px-16 py-10 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-semibold tracking-tight">Jobtracker</span>
          <span className="font-mono text-xs text-graphite">buku besar lamaran</span>
        </div>
        <DoubleRule className="mt-3 mb-9" />

        <h1 className="font-display text-[1.7rem] leading-tight">{judul}</h1>
        <p className="mt-1.5 mb-7 font-mono text-xs text-graphite">{sub}</p>

        <form onSubmit={kirim} className="space-y-4">
          {pesan && <KotakPesan teks={pesan.teks} jenis={pesan.jenis} />}
          <AuthFields mode={mode} v={v} set={set} />
          <button
            type="submit"
            disabled={sibuk}
            className="w-full bg-ink text-paper py-2.5 font-mono text-xs transition-colors hover:bg-stamp disabled:opacity-50 mt-2"
          >
            {sibuk ? 'memproses…' : TOMBOL[mode]}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-graphite">
          {SWITCH[mode].map(([teks, m]) => (
            <button
              key={m}
              type="button"
              onClick={() => ke(m)}
              className="underline underline-offset-4 transition-colors hover:text-stamp"
            >
              {teks}
            </button>
          ))}
        </div>

        <p className="mt-10 font-mono text-[0.7rem] text-faded leading-relaxed">
          Server bangun sekitar 08.00–21.00 WIB. Di luar jam itu login belum bisa — datanya tetap aman.
        </p>
      </main>

      <SampleLedger />
    </div>
  );
}
