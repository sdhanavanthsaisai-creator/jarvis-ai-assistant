import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { searchPlugin } from './vite-search-plugin';

export default defineConfig({
  plugins: [react(), searchPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4180,
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/yahoo/, ''),
      },
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/ollama/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
