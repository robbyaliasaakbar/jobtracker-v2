// Status lamaran — enum sama persis dengan backend (lama & baru).

export const STATUS_LIST = [
  'baru',
  'interview-hr',
  'technical-test',
  'interview-user',
  'offering',
  'diterima',
  'ditolak',
];

// dot = kelas Tailwarn buat penanda warna (scan literal, jangan template string).
export const STATUS_META = {
  baru: { label: 'Baru', dot: 'bg-graphite' },
  'interview-hr': { label: 'Interview HR', dot: 'bg-ochre' },
  'technical-test': { label: 'Technical test', dot: 'bg-steel' },
  'interview-user': { label: 'Interview user', dot: 'bg-plum' },
  offering: { label: 'Offering', dot: 'bg-stamp' },
  diterima: { label: 'Diterima', dot: 'bg-moss' },
  ditolak: { label: 'Ditolak', dot: 'bg-faded' },
};

export const statusMeta = (value) => STATUS_META[value] || STATUS_META.baru;
