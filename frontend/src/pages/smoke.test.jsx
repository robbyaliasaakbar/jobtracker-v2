import { describe, test, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AppStore } from '../store/AppStore.jsx';
import { AuthPage } from './AuthPage.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { OfflinePage } from './OfflinePage.jsx';
import { LamaranTable, EmptyState } from '../components/LamaranTable.jsx';
import { LamaranForm } from '../components/LamaranForm.jsx';
import { PipelineStrip } from '../components/PipelineStrip.jsx';

const bungkus = (ui) => renderToString(<AppStore>{ui}</AppStore>);

const BARIS = [
  { id: '1', company: 'PT Maju', position: 'Dev', date: '2026-09-26', status: 'baru', portal: 'LinkedIn', link: '', createdAt: '' },
  { id: '2', company: 'PT Cepat', position: 'QA', date: '', status: 'diterima', portal: '', link: 'https://contoh.id', createdAt: '' },
];

// Smoke render: kalau ada import mati / typo JSX, langsung meledak di sini.
describe('semua halaman bisa dirender', () => {
  test('AuthPage', () => {
    const html = bungkus(<AuthPage />);
    expect(html).toContain('Jobtracker');
    expect(html).toContain('Masuk');
  });

  test('DashboardPage (state awal = checking, aman)', () => {
    const html = bungkus(<DashboardPage />);
    expect(html).toContain('Jobtracker');
  });

  test('OfflinePage', () => {
    const html = bungkus(<OfflinePage />);
    expect(html).toContain('Server sedang tidur');
  });

  test('PipelineStrip menghitung semua status', () => {
    const html = renderToString(<PipelineStrip lamaran={BARIS} />);
    expect(html).toContain('Baru');
    expect(html).toContain('Diterima');
    expect(html).toContain('Interview HR');
  });

  test('LamaranTable desktop + mobile', () => {
    const html = renderToString(<LamaranTable rows={BARIS} onEdit={() => {}} onDelete={() => {}} />);
    expect(html).toContain('PT Maju');
    expect(html).toContain('https://contoh.id');
    expect(html).toContain('ubah');
    expect(html).toContain('hapus');
  });

  test('EmptyState kosong vs tersaring', () => {
    expect(renderToString(<EmptyState tersaring={false} onTambah={() => {}} />)).toContain('Buku besar masih kosong');
    expect(renderToString(<EmptyState tersaring onTambah={() => {}} />)).toContain('Tidak ada yang cocok');
  });

  test('LamaranForm mode tambah + ubah', () => {
    const tambah = renderToString(
      <LamaranForm mode="tambah" initial={null} onSimpan={() => {}} onHapus={() => {}} onTutup={() => {}} />
    );
    expect(tambah).toContain('Tambah lamaran');
    expect(tambah).toContain('simpan lamaran');

    const ubah = renderToString(
      <LamaranForm mode="ubah" initial={BARIS[0]} onSimpan={() => {}} onHapus={() => {}} onTutup={() => {}} />
    );
    expect(ubah).toContain('Ubah lamaran');
    expect(ubah).toContain('hapus lamaran');
  });
});
