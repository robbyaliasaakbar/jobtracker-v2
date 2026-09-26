import { useEffect, useRef, useState } from 'react';
import { STATUS_LIST, STATUS_META } from '../data/status.js';
import { Field, Input, Select } from './ui.jsx';

const kosong = { company: '', position: '', date: '', status: 'baru', portal: '', link: '' };

// Modal isian lamaran. Mode 'tambah' atau 'ubah' (ubah punya aksi hapus).
export function LamaranForm({ mode, initial, onSimpan, onHapus, onTutup }) {
  const [v, setV] = useState(() => (initial ? { ...kosong, ...initial } : kosong));
  const [pesan, setPesan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const firstField = useRef(null);

  const set = (k) => (e) => setV((old) => ({ ...old, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onTutup();
    };
    document.addEventListener('keydown', onKey);
    firstField.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onTutup]);

  async function kirim(e) {
    e.preventDefault();
    setPesan('');
    setSibuk(true);
    try {
      await onSimpan(v);
      onTutup();
    } catch (err) {
      setPesan(err.message || 'Gagal menyimpan.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Tutup formulir"
        onClick={onTutup}
        className="fixed inset-0 bg-ink/40 cursor-default"
      />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-form"
          className="w-full max-w-lg bg-paper-raised border border-ink shadow-[6px_6px_0_rgba(22,24,28,0.14)]"
        >
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3 border-b border-ink">
            <h2 id="judul-form" className="font-display text-xl">
              {mode === 'ubah' ? 'Ubah lamaran' : 'Tambah lamaran'}
            </h2>
            <button
              type="button"
              onClick={onTutup}
              className="font-mono text-xs underline underline-offset-4 transition-colors hover:text-stamp"
            >
              tutup
            </button>
          </div>

          <form onSubmit={kirim} className="px-6 py-5 space-y-4">
            {pesan && (
              <p role="alert" className="border-l-2 border-stamp bg-stamp/10 px-3 py-2 font-mono text-xs">
                {pesan}
              </p>
            )}

            <Field label="perusahaan" wajib>
              <Input
                ref={firstField}
                value={v.company}
                onChange={set('company')}
                placeholder="PT Maju Jaya"
                required
                maxLength={200}
              />
            </Field>

            <Field label="posisi" wajib>
              <Input
                value={v.position}
                onChange={set('position')}
                placeholder="Frontend Engineer"
                required
                maxLength={200}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="tanggal">
                <Input type="date" value={v.date || ''} onChange={set('date')} />
              </Field>
              <Field label="status">
                <Select value={v.status} onChange={set('status')}>
                  {STATUS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="portal">
                <Input value={v.portal} onChange={set('portal')} placeholder="LinkedIn" maxLength={100} />
              </Field>
              <Field label="link lowongan">
                <Input value={v.link} onChange={set('link')} placeholder="https://…" inputMode="url" maxLength={500} />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              {mode === 'ubah' ? (
                <button
                  type="button"
                  onClick={() => onHapus(v)}
                  className="font-mono text-xs text-stamp underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  hapus lamaran
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onTutup}
                  className="border border-rule px-4 py-2 font-mono text-xs transition-colors hover:border-ink"
                >
                  batal
                </button>
                <button
                  type="submit"
                  disabled={sibuk}
                  className="bg-ink text-paper px-4 py-2 font-mono text-xs transition-colors hover:bg-stamp disabled:opacity-50"
                >
                  {sibuk ? 'menyimpan…' : 'simpan lamaran'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
