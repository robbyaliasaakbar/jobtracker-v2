import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Port dev: 7013 (booking PRD).
// Base path Pages (/jobtracker/) dibaca dari .env.production -> VITE_BASE,
// jadi `npm run build` di CI dan script deploy menghasilkan build yang sama.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || process.env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
    server: { port: 7013, strictPort: true },
    preview: { port: 7013, strictPort: true },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
