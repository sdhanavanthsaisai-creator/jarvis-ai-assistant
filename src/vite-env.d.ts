/// <reference types="vite/client" />

// Electron API exposed via preload
interface ElectronAPI {
  ai: {
    query: (prompt: string) => Promise<{ response: string; model: string; duration: number }>;
    stream: (
      prompt: string,
      onChunk: (chunk: string) => void,
      onDone: () => void
    ) => (() => void);
    listModels: () => Promise<string[]>;
    setModel: (model: string) => Promise<boolean>;
  };
  system: {
    openApp: (appName: string) => Promise<{ success: boolean; message: string }>;
    runCommand: (command: string) => Promise<{ success: boolean; output: string }>;
    getInfo: () => Promise<Record<string, string>>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  theme: {
    get: () => Promise<string>;
  };
  stock: {
    getQuotes: (symbols: string[]) => Promise<any[]>;
    getIndices: () => Promise<any[]>;
    getSectors: () => Promise<any[]>;
    getMarketStatus: () => Promise<string>;
    onUpdate: (callback: (data: any[]) => void) => void;
  };
  weather: {
    get: () => Promise<any>;
    onUpdate: (callback: (data: any) => void) => void;
    onError: (callback: (error: string) => void) => void;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
