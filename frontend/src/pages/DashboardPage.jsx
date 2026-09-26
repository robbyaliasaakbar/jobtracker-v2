import { useMemo, useState } from 'react';
import { useStore } from '../store/AppStore.jsx';
import { urutTerbaru } from '../store/reducer.js';
import { Masthead } from '../components/Masthead.jsx';
import { PipelineStrip } from '../components/PipelineStrip.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { LamaranTable, EmptyState } from '../components/LamaranTable.jsx';
import { LamaranForm } from '../components/LamaranForm.jsx';

export function DashboardPage() {
  const { state, keluar, tambah, ubah, hapus, muatList, toast } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('semua');
  const [urut, setUrut] = useState('desc');
  const [form, setForm] = useState(null); // null | {mode:'tambah'} | {mode:'ubah', row}

  const rows = useMemo(() => {
    let out = state.lamaran;
    const kata = q.trim().toLowerCase();
    if (kata) {
      out = out.filter((x) =>
        `${x.company} ${x.position} ${x.portal}`.toLowerCase().includes(kata)
      );
    }
    if (status !== 'semua') out = out.filter((x) => x.status === status);
    out = urutTerbaru(out);
    if (urut === 'asc') out = [...out].reverse();
    return out;
  }, [state.lamaran, q, status, urut]);

  const tersaring = q.trim() !== '' || status !== 'semua';

  async function simpanForm(v) {
    if (form && form.mode === 'ubah') {
      await ubah(form.row.id, v);
      toast('Lamaran diperbarui.');
    } else {
      await tambah(v);
      toast('Lamaran tersimpan.');
    }
  }

  async function hapusForm(v) {
    const yakin = window.confirm(`Hapus lamaran di ${v.company || 'perusahaan ini'}?`);
    if (!yakin) return;
    try {
      await hapus(v.id);
      setForm(null);
      toast('Lamaran dihapus.');
    } catch (err) {
      toast(err.message || 'Gagal menghapus.', 'error');
    }
  }

  return (
    <div className="min-h-screen">
      <Masthead email={state.user ? state.user.email : ''} onLogout={keluar} />
      <PipelineStrip lamaran={state.lamaran} />

      <Toolbar
        q={q}
        onQ={setQ}
        status={status}
        onStatus={setStatus}
        urut={urut}
        onUrut={() => setUrut((u) => (u === 'desc' ? 'asc' : 'desc'))}
        onTambah={() => setForm({ mode: 'tambah' })}
      />

      {state.listError && (
        <div className="mx-auto max-w-5xl px-5 pb-2">
          <p className="flex flex-wrap items-center gap-3 border-l-2 border-stamp bg-stamp/10 px-3 py-2 font-mono text-xs">
            Data belum bisa dimuat: {state.listError}
            <button
              type="button"
              onClick={muatList}
              className="underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              coba lagi
            </button>
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <LamaranTable
          rows={rows}
          onEdit={(row) => setForm({ mode: 'ubah', row })}
          onDelete={(row) => hapusForm(row)}
        />
      )}
      {rows.length === 0 && !state.listError && (
        <EmptyState tersaring={tersaring} onTambah={() => setForm({ mode: 'tambah' })} />
      )}
      <div className="pb-10" />

      {form && (
        <LamaranForm
          mode={form.mode}
          initial={form.mode === 'ubah' ? form.row : null}
          onSimpan={simpanForm}
          onHapus={hapusForm}
          onTutup={() => setForm(null)}
        />
      )}
    </div>
  );
}
