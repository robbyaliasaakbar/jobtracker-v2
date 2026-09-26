import { statusMeta } from '../data/status.js';

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[0.8rem] whitespace-nowrap">
      <span aria-hidden="true" className={`inline-block size-[7px] ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
