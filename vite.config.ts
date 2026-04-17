import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3005,
    host: '0.0.0.0',
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
      },
      '/.netlify/functions': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'es2022',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
