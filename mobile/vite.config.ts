import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: projectRoot + 'public',
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'next/link', replacement: projectRoot + 'mobile/LocalLink.tsx' },
      { find: '@', replacement: projectRoot.slice(0, -1) },
    ],
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: projectRoot + 'dist-mobile',
    emptyOutDir: true,
    target: 'safari16.4',
    sourcemap: false,
  },
});
