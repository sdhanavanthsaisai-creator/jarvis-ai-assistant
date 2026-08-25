import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                'electron',
                'better-sqlite3',
                'chokidar',
                'node-cron',
                'node-notifier',
                'puppeteer',
                'rss-parser',
                'ollama',
              ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
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
      '/api/rss/reuters': {
        target: 'https://www.reutersagency.com/feed/',
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
        rewrite: (path) => path.replace(/^\/api\/search\/ddg/, '/html'),
      },
      '/api/search/searxng': {
        target: 'https://search.inetol.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search\/searxng/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
