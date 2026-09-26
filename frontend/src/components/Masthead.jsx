import { DoubleRule } from './ui.jsx';

const tanggalHariIni = () =>
  new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function Masthead({ email, onLogout }) {
  return (
    <header className="bg-paper">
      <div className="mx-auto max-w-5xl px-5 py-3 flex items-baseline justify-between gap-4">
        <span className="font-display text-xl font-semibold tracking-tight">Jobtracker</span>
        <span className="hidden sm:block font-mono text-xs text-graphite tabular-nums">{tanggalHariIni()}</span>
        <div className="flex items-baseline gap-4 font-mono text-xs min-w-0">
          <span className="text-graphite truncate max-w-[38vw] sm:max-w-xs">{email}</span>
          <button type="button" onClick={onLogout} className="underline underline-offset-4 transition-colors hover:text-stamp">
            keluar
          </button>
        </div>
      </div>
      <DoubleRule />
    </header>
  );
}
