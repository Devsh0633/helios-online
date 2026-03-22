import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  build: {
    sourcemap: true,
    target: 'es2020'
  },
  preview: {
    host: true,
    port: 4173
  },
  server: {
    host: true,
    port: 5173
  }
});
