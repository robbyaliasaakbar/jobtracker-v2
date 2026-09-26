import { StatusBadge } from './StatusBadge.jsx';

function Portal({ row }) {
  const label = row.portal || (row.link ? 'tautan' : '');
  if (!label) return <span className="text-faded">—</span>;
  if (!row.link) return <span className="font-mono text-xs text-graphite">{label}</span>;
  return (
    <a
      href={row.link}
      target="_blank"
      rel="noreferrer noopener"
      className="font-mono text-xs underline underline-offset-4 transition-colors hover:text-stamp"
    >
      {label}
    </a>
  );
}

function Aksi({ row, onEdit, onDelete }) {
  return (
    <div className="flex items-baseline justify-end gap-3 font-mono text-xs">
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="underline underline-offset-4 transition-colors hover:text-ink"
      >
        ubah
      </button>
      <button
        type="button"
        onClick={() => onDelete(row)}
        className="underline underline-offset-4 text-stamp transition-opacity hover:opacity-70"
      >
        hapus
      </button>
    </div>
  );
}

export function EmptyState({ tersaring, onTambah }) {
  if (tersaring) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-14">
        <p className="font-display text-xl">Tidak ada yang cocok.</p>
        <p className="mt-2 font-mono text-xs text-graphite">
          Ubah kata kunci atau pilih status yang lain.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <p className="font-display text-xl">Buku besar masih kosong.</p>
      <p className="mt-2 font-mono text-xs text-graphite leading-relaxed max-w-md">
        Catat lamaran pertamamu: perusahaan, posisi, tanggal, status. Semua baris hanya terlihat olehmu.
      </p>
      <button
        type="button"
        onClick={onTambah}
        className="mt-6 bg-ink text-paper px-4 py-2 font-mono text-xs transition-colors hover:bg-stamp"
      >
        + tambah lamaran
      </button>
    </div>
  );
}

// Buku besar: tabel garis rambut di desktop, tumpukan kartu di layar kecil.
export function LamaranTable({ rows, onEdit, onDelete }) {
  if (!rows.length) return null;

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20">
      {/* desktop */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr className="border-b border-ink text-left font-mono text-[0.7rem] text-graphite">
            <th className="py-2 pr-4 font-normal">tanggal</th>
            <th className="py-2 pr-4 font-normal">perusahaan</th>
            <th className="py-2 pr-4 font-normal">posisi</th>
            <th className="py-2 pr-4 font-normal">portal</th>
            <th className="py-2 pr-4 font-normal">status</th>
            <th className="py-2 font-normal text-right">aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-rule align-top transition-colors hover:bg-paper-raised">
              <td className="py-3 pr-4 font-mono text-xs text-graphite whitespace-nowrap tabular-nums">
                {row.date || '—'}
              </td>
              <td className="py-3 pr-4 text-sm font-medium">{row.company}</td>
              <td className="py-3 pr-4 text-sm text-ink/75">{row.position}</td>
              <td className="py-3 pr-4">
                <Portal row={row} />
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={row.status} />
              </td>
              <td className="py-3">
                <Aksi row={row} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile */}
      <ul className="md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-rule py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs text-graphite tabular-nums">{row.date || '—'}</span>
              <StatusBadge status={row.status} />
            </div>
            <p className="mt-1.5 text-sm font-medium leading-snug">{row.company}</p>
            <p className="text-sm text-ink/75 leading-snug">{row.position}</p>
            {(row.portal || row.link) && (
              <p className="mt-1">
                <Portal row={row} />
              </p>
            )}
            <div className="mt-3">
              <Aksi row={row} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
