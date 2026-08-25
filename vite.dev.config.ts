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
      '/api/rss/techcrunch': {
        target: 'https://techcrunch.com/feed/',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api/rss/bbc': {
        target: 'https://feeds.bbci.co.uk/news/rss.xml',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api/rss/hn': {
        target: 'https://hnrss.org/frontpage',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api/rss/india': {
        target: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api/search/ddg': {
        target: 'https://html.duckduckgo.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/search\/ddg/, '/html'),
      },
      '/api/search/searxng': {
        target: 'https://search.inetol.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/search\/searxng/, ''),
      },
    },
  },
});
