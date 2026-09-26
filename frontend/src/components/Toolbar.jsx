import { STATUS_LIST, STATUS_META } from '../data/status.js';
import { Select } from './ui.jsx';

// Pencarian, filter status, urut, dan tombol tambah — satu baris padat.
export function Toolbar({ q, onQ, status, onStatus, urut, onUrut, onTambah }) {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="block">
          <span className="block font-mono text-[0.7rem] text-graphite mb-1">cari</span>
          <input
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="perusahaan atau posisi"
            className="w-44 sm:w-56 bg-transparent border-b border-rule py-1.5 text-sm placeholder:text-faded focus:border-ink focus:outline-none transition-colors"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[0.7rem] text-graphite mb-1">status</span>
          <Select value={status} onChange={(e) => onStatus(e.target.value)} className="py-1.5 text-sm w-40">
            <option value="semua">semua status</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </label>

        <button
          type="button"
          onClick={onUrut}
          className="font-mono text-xs underline underline-offset-4 mb-1 transition-colors hover:text-stamp"
        >
          urut: {urut === 'desc' ? 'terbaru' : 'terlama'}
        </button>
      </div>

      <button
        type="button"
        onClick={onTambah}
        className="bg-ink text-paper px-4 py-2 font-mono text-xs transition-colors hover:bg-stamp"
      >
        + tambah lamaran
      </button>
    </div>
  );
}
