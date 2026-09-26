// Notifikasi pil kecil di bawah layar. Klik untuk menutup, auto-hilang juga.

export function Toasts({ toasts, onPop }) {
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onPop(t.id)}
          className={`px-4 py-2 font-mono text-xs text-paper shadow-[3px_3px_0_rgba(22,24,28,0.18)] transition-opacity hover:opacity-90 ${
            t.kind === 'error' ? 'bg-stamp' : 'bg-ink'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
