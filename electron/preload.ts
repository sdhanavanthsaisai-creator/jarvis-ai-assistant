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
    onUpdate: (callback: (data: any[]) => void) => {
      ipcRenderer.on('stock:update', (_event, data) => callback(data));
    },
  },

  // ── Weather ──
  weather: {
    get: (): Promise<any> =>
      ipcRenderer.invoke('weather:get'),
    onUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('weather:update', (_event, data) => callback(data));
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('weather:error', (_event, error) => callback(error));
    },
  },

  // ── Email (Gmail API) ──
  email: {
    authenticate: (clientId: string, clientSecret: string): Promise<any> =>
      ipcRenderer.invoke('email:authenticate', clientId, clientSecret),

    handleAuthCallback: (code: string): Promise<any> =>
      ipcRenderer.invoke('email:auth-callback', code),

    parseDraft: (input: string): Promise<any> =>
      ipcRenderer.invoke('email:parse-draft', input),

    confirmSend: (draft: any): Promise<any> =>
      ipcRenderer.invoke('email:confirm-send', draft),

    readInbox: (maxResults?: number): Promise<any> =>
      ipcRenderer.invoke('email:read-inbox', maxResults),

    searchEmails: (query: string, maxResults?: number): Promise<any> =>
      ipcRenderer.invoke('email:search-emails', query, maxResults),

    getStatus: (): Promise<any> =>
      ipcRenderer.invoke('email:get-status'),
  },

  // ── Web Search ──
  web: {
    search: (query: string, numResults?: number): Promise<any> =>
      ipcRenderer.invoke('web:search', query, numResults),

    fetch: (url: string, maxLength?: number): Promise<any> =>
      ipcRenderer.invoke('web:fetch', url, maxLength),

    summarize: (query: string): Promise<any> =>
      ipcRenderer.invoke('web:summarize', query),
  },

  // ── Browser Automation ──
  browser: {
    open: (): Promise<any> =>
      ipcRenderer.invoke('browser:open'),

    navigate: (url: string): Promise<any> =>
      ipcRenderer.invoke('browser:navigate', url),

    action: (type: string, selector?: string, text?: string): Promise<any> =>
      ipcRenderer.invoke('browser:action', type, selector, text),

    getContent: (): Promise<any> =>
      ipcRenderer.invoke('browser:get-content'),

    screenshot: (): Promise<any> =>
      ipcRenderer.invoke('browser:screenshot'),

    close: (): Promise<any> =>
      ipcRenderer.invoke('browser:close'),

    getStatus: (): Promise<any> =>
      ipcRenderer.invoke('browser:get-status'),
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
