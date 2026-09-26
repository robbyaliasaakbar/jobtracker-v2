// Primitif bentuk & tombol — bahasa visual "formulir di kertas":
// label mono kecil, isian bergaris bawah, tombol persegi tinta.

export function Field({ label, wajib, children }) {
  return (
    <label className="block">
      <span className="block font-mono text-[0.7rem] text-graphite mb-1">
        {label}
        {wajib ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full bg-transparent border-b border-rule py-2 text-sm placeholder:text-faded focus:border-ink focus:outline-none transition-colors';

export function Input({ ...props }) {
  return <input className={inputClass} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={`${inputClass} appearance-none cursor-pointer`} {...props}>
      {children}
    </select>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="bg-ink text-paper px-4 py-2 font-mono text-xs transition-colors hover:bg-stamp disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="border border-rule px-4 py-2 font-mono text-xs transition-colors hover:border-ink"
      {...props}
    >
      {children}
    </button>
  );
}

// Garis ganda tipografi — penanda masthead ala buku besar cetak.
export function DoubleRule({ className = '' }) {
  return (
    <div className={`flex flex-col gap-[3px] ${className}`} aria-hidden="true">
      <div className="h-px bg-ink" />
      <div className="h-px bg-ink" />
    </div>
  );
}
