import { STATUS_LIST, STATUS_META } from '../data/status.js';

// Deret pipeline: angka mono per tahap. Kotak vermilion = tahap yang berisi.
export function PipelineStrip({ lamaran }) {
  const hitung = (s) => lamaran.filter((x) => x.status === s).length;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-7">
      <ol className="grid grid-cols-4 sm:grid-cols-7 gap-x-5 gap-y-5">
        {STATUS_LIST.map((s) => {
          const n = hitung(s);
          const meta = STATUS_META[s];
          return (
            <li key={s} className="border-t border-ink/70 pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl leading-none tabular-nums ${n ? 'text-ink' : 'text-faded'}`}>
                  {n}
                </span>
                {n > 0 && <span aria-hidden="true" className="inline-block size-[7px] bg-stamp self-center" />}
              </div>
              <span className="mt-1.5 block font-mono text-[0.7rem] leading-tight text-graphite">{meta.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
