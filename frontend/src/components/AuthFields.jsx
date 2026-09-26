import { Field, Input } from './ui.jsx';

// Isian form login per mode. v = nilai form induk, set = pembuat handler.

export function AuthFields({ mode, v, set }) {
  if (mode === 'login' || mode === 'daftar') {
    return (
      <>
        {mode === 'daftar' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="nama">
              <Input value={v.nama || ''} onChange={set('nama')} autoComplete="name" />
            </Field>
            <Field label="telepon">
              <Input value={v.telepon || ''} onChange={set('telepon')} autoComplete="tel" />
            </Field>
          </div>
        )}
        <Field label="email" wajib>
          <Input
            type="email"
            value={v.email || ''}
            onChange={set('email')}
            autoComplete="email"
            required
            placeholder="nama@contoh.id"
          />
        </Field>
        <Field label="password" wajib>
          <Input
            type="password"
            value={v.password || ''}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
        </Field>
        {mode === 'daftar' && (
          <Field label="ulangi password" wajib>
            <Input
              type="password"
              value={v.konfirmasi || ''}
              onChange={set('konfirmasi')}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
        )}
      </>
    );
  }

  if (mode === 'otp' || mode === 'reset') {
    return (
      <>
        {mode === 'reset' && (
          <Field label="email" wajib>
            <Input type="email" value={v.email || ''} onChange={set('email')} required />
          </Field>
        )}
        <Field label="kode dari email" wajib>
          <Input
            value={v.kode || ''}
            onChange={set('kode')}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="123456"
          />
        </Field>
        {mode === 'reset' && (
          <Field label="password baru" wajib>
            <Input
              type="password"
              value={v.passwordBaru || ''}
              onChange={set('passwordBaru')}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
        )}
      </>
    );
  }

  // lupa
  return (
    <Field label="email terdaftar" wajib>
      <Input type="email" value={v.email || ''} onChange={set('email')} required />
    </Field>
  );
}
