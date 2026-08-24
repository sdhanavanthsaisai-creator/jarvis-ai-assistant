import { contextBridge, ipcRenderer } from 'electron';

// ══════════════════════════════════════════════════════
// SECURE IPC BRIDGE — Exposed to Renderer
// ══════════════════════════════════════════════════════

const electronAPI = {
  // ── AI Brain ──
  ai: {
    query: (prompt: string): Promise<any> =>
      ipcRenderer.invoke('ai:query', prompt),

    stream: (prompt: string, onChunk: (chunk: string) => void, onDone: () => void): (() => void) => {
      let channel: string | null = null;

      ipcRenderer.invoke('ai:stream', prompt).then((ch: string) => {
        channel = ch;
      });

      const handleChunk = (_event: any, data: { type: string; data: string }) => {
        if (data.type === 'chunk') {
          onChunk(data.data);
        } else if (data.type === 'done') {
          onDone();
          cleanup();
        }
      };

      const cleanup = () => {
        ipcRenderer.removeAllListeners(`ai:stream:${channel}`);
      };

      ipcRenderer.on('ai:stream:callback', handleChunk);

      // Use a polling approach for the channel
      ipcRenderer.on('ai:response', (_e: any, data: any) => {
        if (data && data.channel) {
          ipcRenderer.removeAllListeners(`ai:stream:${data.channel}`);
          ipcRenderer.on(`ai:stream:${data.channel}`, handleChunk);
        }
      });

      return cleanup;
    },

    listModels: (): Promise<string[]> =>
      ipcRenderer.invoke('ai:models'),

    setModel: (model: string): Promise<boolean> =>
      ipcRenderer.invoke('ai:set-model', model),
  },

  // ── System Control ──
  system: {
    openApp: (appName: string): Promise<any> =>
      ipcRenderer.invoke('system:open-app', appName),

    runCommand: (command: string): Promise<any> =>
      ipcRenderer.invoke('system:run-command', command),

    getInfo: (): Promise<any> =>
      ipcRenderer.invoke('system:info'),
  },

  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // ── Theme ──
  theme: {
    get: (): Promise<string> => ipcRenderer.invoke('theme:get'),
  },

  // ── Indian Stocks ──
  stock: {
    getQuotes: (symbols: string[]): Promise<any[]> =>
      ipcRenderer.invoke('stock:get-quotes', symbols),
    getIndices: (): Promise<any[]> =>
      ipcRenderer.invoke('stock:get-indices'),
    getSectors: (): Promise<any[]> =>
      ipcRenderer.invoke('stock:get-sectors'),
    getMarketStatus: (): Promise<string> =>
      ipcRenderer.invoke('stock:market-status'),
    watchlistAdd: (data: { name: string; symbol: string }): Promise<void> =>
      ipcRenderer.invoke('stock:watchlist-add', data),
    watchlistRemove: (symbol: string): Promise<void> =>
      ipcRenderer.invoke('stock:watchlist-remove', symbol),
    onUpdate: (callback: (data: any[]) => void) => {
      ipcRenderer.on('stock:update', (_event, data) => callback(data));
    },
  },

  // ── Weather ──
  weather: {
    get: (): Promise<any> =>
      ipcRenderer.invoke('weather:get'),
    refresh: (): Promise<any> =>
      ipcRenderer.invoke('weather:refresh'),
    onUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('weather:update', (_event, data) => callback(data));
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('weather:error', (_event, error) => callback(error));
    },
  },

  // ── Event Listeners ──
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// Expose to window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the renderer
export type ElectronAPI = typeof electronAPI;
