import { useStore } from '../store/AppStore.jsx';
import { DoubleRule } from '../components/ui.jsx';

// Layar "server sedang tidur" — PC lagi mati / di luar jam 08.00-21.00 WIB.
// Sesinya TIDAK dibuang (PRD §8: designed for scheduled availability).
export function OfflinePage() {
  const { state, cobaLagi, keluar } = useStore();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <span className="font-display text-3xl font-semibold tracking-tight">Jobtracker</span>
        <DoubleRule className="mt-3 mb-8" />
        <h1 className="font-display text-3xl leading-tight">Server sedang tidur.</h1>
        <p className="mt-3 text-sm text-graphite leading-relaxed">
          Backend biasanya bangun 08.00–21.00 WIB. Sesimu tidak kemana-mana — coba lagi setelah server
          nyala, atau keluar lalu masuk lagi nanti.
        </p>
        {state.offlineMessage && (
          <p className="mt-4 font-mono text-xs text-faded">{state.offlineMessage}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={cobaLagi}
            className="bg-ink text-paper px-4 py-2 font-mono text-xs transition-colors hover:bg-stamp"
          >
            coba lagi
          </button>
          <button
            type="button"
            onClick={keluar}
            className="border border-rule px-4 py-2 font-mono text-xs transition-colors hover:border-ink"
          >
            keluar
          </button>
        </div>
      </div>
    </main>
  );
}
