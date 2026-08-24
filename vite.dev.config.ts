import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
      '/api/owm': {
        target: 'https://api.openweathermap.org',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/owm/, ''),
      },
    },
  },
});
