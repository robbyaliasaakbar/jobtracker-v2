import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Port dev: 7013 (booking PRD).
// base './' biar hasil build bisa ditaro di subfolder apapun (/jobtracker/)
// tanpa ganti config — pola yang sama dengan contentOS/miniLeads.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 7013, strictPort: true },
  preview: { port: 7013, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
