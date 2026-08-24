import { create } from 'zustand';
import type { StockQuote, WeatherData } from './types';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  category: string;
}

// ══════════════════════════════════════════════════════
// JARVIS GLOBAL STATE (Zustand)
// ══════════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  isStreaming?: boolean;
}

interface JarvisState {
  // ── AI State ──
  currentModel: string;
  availableModels: string[];
  isProcessing: boolean;
  isOllamaConnected: boolean;

  // ── Voice State ──
  isListening: boolean;
  isSpeaking: boolean;

  // ── Chat ──
  messages: ChatMessage[];

  // ── System Info ──
  systemInfo: Record<string, string>;

  // ── UI State ──
  activePage: string;

  // ── Indian Stocks ──
  indianIndices: StockQuote[];
  sectorIndices: StockQuote[];
  stockWatchlist: StockQuote[];
  stockMarketStatus: 'open' | 'closed' | 'pre-market' | 'post-market';

  // ── Weather ──
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;

  // ── News ──
  newsArticles: NewsArticle[];
  newsLoading: boolean;

  // ── Actions ──
  setNewsArticles: (articles: NewsArticle[]) => void;
  setNewsLoading: (v: boolean) => void;
  setCurrentModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
  setProcessing: (v: boolean) => void;
  setOllamaConnected: (v: boolean) => void;
  setListening: (v: boolean) => void;
  setSpeaking: (v: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  clearMessages: () => void;
  setSystemInfo: (info: Record<string, string>) => void;
  setActivePage: (page: string) => void;
  setIndianIndices: (indices: StockQuote[]) => void;
  setSectorIndices: (sectors: StockQuote[]) => void;
  setStockWatchlist: (stocks: StockQuote[]) => void;
  setStockMarketStatus: (status: 'open' | 'closed' | 'pre-market' | 'post-market') => void;
  setWeather: (weather: WeatherData) => void;
  setWeatherLoading: (v: boolean) => void;
  setWeatherError: (error: string | null) => void;
}

export const useJarvisStore = create<JarvisState>((set) => ({
  // ── Initial State ──
  currentModel: 'llama3.2',
  availableModels: [],
  isProcessing: false,
  isOllamaConnected: false,
  isListening: false,
  isSpeaking: false,
  messages: [],
  systemInfo: {},
  activePage: 'dashboard',
  indianIndices: [],
  sectorIndices: [],
  stockWatchlist: [],
  stockMarketStatus: 'closed',
  weather: null,
  weatherLoading: false,
  weatherError: null,
  newsArticles: [],
  newsLoading: false,

  // ── Actions ──
  setCurrentModel: (model) => set({ currentModel: model }),
  setAvailableModels: (models) => set({ availableModels: models }),
  setProcessing: (v) => set({ isProcessing: v }),
  setOllamaConnected: (v) => set({ isOllamaConnected: v }),
  setListening: (v) => set({ isListening: v }),
  setSpeaking: (v) => set({ isSpeaking: v }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content, isStreaming: false };
      }
      return { messages: msgs };
    }),

  clearMessages: () => set({ messages: [] }),
  setSystemInfo: (info) => set({ systemInfo: info }),
  setActivePage: (page) => set({ activePage: page }),
  setIndianIndices: (indices) => set({ indianIndices: indices }),
  setSectorIndices: (sectors) => set({ sectorIndices: sectors }),
  setStockWatchlist: (stocks) => set({ stockWatchlist: stocks }),
  setStockMarketStatus: (status) => set({ stockMarketStatus: status }),
  setWeather: (weather) => set({ weather, weatherError: null }),
  setWeatherLoading: (v) => set({ weatherLoading: v }),
  setWeatherError: (error) => set({ weatherError: error }),
  setNewsArticles: (articles) => set({ newsArticles: articles }),
  setNewsLoading: (v) => set({ newsLoading: v }),
}));
