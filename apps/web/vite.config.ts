import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './', // funciona em / e em /estudos/ (D009)
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8090' },
  },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
