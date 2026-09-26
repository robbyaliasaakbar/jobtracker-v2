// Kolom kanan halaman login: contoh halaman buku besar (data REKAAN,
// bukan data asli user) + stempel vermilion sebagai satu aksen berani.

const CONTOH = [
  ['2026-09-22', 'Nusantara Digital', 'Frontend Engineer', 'interview-hr'],
  ['2026-09-19', 'Cakrawala Data', 'Backend Engineer', 'technical-test'],
  ['2026-09-15', 'Karya Logistik', 'Fullstack Developer', 'baru'],
  ['2026-09-11', 'Sentra Medika', 'Platform Engineer', 'ditolak'],
  ['2026-09-05', 'Bumi Energi', 'Node.js Developer', 'offering'],
];

import { DoubleRule } from './ui.jsx';

export function SampleLedger() {
  return (
    <aside className="hidden lg:flex flex-col border-l border-ink bg-paper-raised px-10 py-12">
      <p className="font-mono text-[0.7rem] text-graphite">contoh halaman</p>
      <DoubleRule className="mt-3" />
      <div className="mt-5 grid grid-cols-[5.5rem_1fr_8rem] gap-x-4 font-mono text-[0.7rem] text-graphite">
        <span>tanggal</span>
        <span>perusahaan / posisi</span>
        <span>status</span>
      </div>
      <ul className="mt-2">
        {CONTOH.map(([tgl, pt, pos, st]) => (
          <li key={tgl} className="grid grid-cols-[5.5rem_1fr_8rem] gap-x-4 items-baseline border-b border-rule py-3">
            <span className="font-mono text-xs text-graphite tabular-nums">{tgl}</span>
            <span>
              <span className="block text-sm font-medium leading-snug">{pt}</span>
              <span className="block text-xs text-ink/70 leading-snug">{pos}</span>
            </span>
            <span className="font-mono text-[0.7rem] text-graphite">{st}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-10 flex justify-end">
        <span
          aria-hidden="true"
          className="inline-block -rotate-6 border-2 border-stamp/80 text-stamp/90 font-display text-lg px-4 py-1"
        >
          diterima
        </span>
      </div>
    </aside>
  );
}
