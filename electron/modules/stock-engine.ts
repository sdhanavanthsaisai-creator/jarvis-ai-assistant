// electron/modules/stock-engine.ts
import { EventEmitter } from 'events';

const INDEX_SYMBOLS: Record<string, string> = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'BANK NIFTY': '^NSEBANK',
};

const SECTOR_SYMBOLS: Record<string, string> = {
  'NIFTY IT': '^CNXIT',
  'NIFTY PHARMA': '^CNXPHARMA',
  'NIFTY AUTO': '^CNXAUTO',
  'NIFTY FMCG': '^CNXFMCG',
  'NIFTY METAL': '^CNXMETAL',
  'NIFTY REALTY': '^CNXREALTY',
  'NIFTY MIDCAP 50': '^NSEMDCP50',
};

const DEFAULT_WATCHLIST: Array<{ name: string; symbol: string }> = [
  { name: 'Reliance', symbol: 'RELIANCE.NS' },
  { name: 'TCS', symbol: 'TCS.NS' },
  { name: 'HDFC Bank', symbol: 'HDFCBANK.NS' },
  { name: 'Infosys', symbol: 'INFY.NS' },
  { name: 'ICICI Bank', symbol: 'ICICIBANK.NS' },
  { name: 'SBI', symbol: 'SBIN.NS' },
  { name: 'Bharti Airtel', symbol: 'BHARTIARTL.NS' },
  { name: 'ITC', symbol: 'ITC.NS' },
  { name: 'L&T', symbol: 'LT.NS' },
  { name: 'Tata Motors', symbol: 'TATAMOTORS.NS' },
];

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  volume: number;
  timestamp: number;
}

class StockEngine {
  private eventBus: EventEmitter;
  private watchlist: Array<{ name: string; symbol: string }> = [...DEFAULT_WATCHLIST];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private cachedQuotes: StockQuote[] = [];

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('stock:refresh', () => this.fetchAllQuotes());
    this.eventBus.on('stock:add-symbol', (data: { name: string; symbol: string }) => {
      if (!this.watchlist.find(s => s.symbol === data.symbol)) {
        this.watchlist.push(data);
      }
    });
    this.eventBus.on('stock:remove-symbol', (symbol: string) => {
      this.watchlist = this.watchlist.filter(s => s.symbol !== symbol);
    });
  }

  async fetchQuotes(symbols: string[]): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];
    const batchSize = 3;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(symbol => this.fetchSingleQuote(symbol))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          quotes.push(result.value);
        }
      }
    }

    return quotes;
  }

  private async fetchSingleQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (!response.ok) return null;

      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      return {
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.symbol || symbol,
        price,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        dayHigh: meta.regularMarketDayHigh || price,
        dayLow: meta.regularMarketDayLow || price,
        week52High: meta.fiftyTwoWeekHigh || 0,
        week52Low: meta.fiftyTwoWeekLow || 0,
        volume: meta.regularMarketVolume || 0,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      console.warn(`[Stock] Failed to fetch ${symbol}:`, err.message);
      return null;
    }
  }

  async fetchAllQuotes(): Promise<void> {
    const allSymbols = [
      ...Object.values(INDEX_SYMBOLS),
      ...Object.values(SECTOR_SYMBOLS),
      ...this.watchlist.map(s => s.symbol),
    ];

    const quotes = await this.fetchQuotes(allSymbols);
    this.cachedQuotes = quotes;
    this.eventBus.emit('stock:update', quotes);
  }

  async fetchIndices(): Promise<StockQuote[]> {
    const symbols = Object.values(INDEX_SYMBOLS);
    return this.fetchQuotes(symbols);
  }

  async fetchSectorIndices(): Promise<StockQuote[]> {
    const symbols = Object.values(SECTOR_SYMBOLS);
    return this.fetchQuotes(symbols);
  }

  getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'post-market' {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    if (day === 0 || day === 6) return 'closed';
    if (timeInMinutes >= 555 && timeInMinutes < 930) return 'open'; // 9:15 - 15:30
    if (timeInMinutes >= 375 && timeInMinutes < 555) return 'pre-market'; // 6:15 - 9:15
    if (timeInMinutes >= 930 && timeInMinutes < 1005) return 'post-market'; // 15:30 - 16:45
    return 'closed';
  }

  addToWatchlist(name: string, symbol: string): void {
    if (!this.watchlist.find(s => s.symbol === symbol)) {
      this.watchlist.push({ name, symbol });
    }
  }

  removeFromWatchlist(symbol: string): void {
    this.watchlist = this.watchlist.filter(s => s.symbol !== symbol);
  }

  getWatchlist(): Array<{ name: string; symbol: string }> {
    return [...this.watchlist];
  }

  startAutoRefresh(): void {
    this.fetchAllQuotes();
    const interval = this.getMarketStatus() === 'open' ? 5 * 60 * 1000 : 30 * 60 * 1000;
    this.refreshTimer = setInterval(() => {
      const newInterval = this.getMarketStatus() === 'open' ? 5 * 60 * 1000 : 30 * 60 * 1000;
      if (newInterval !== interval) {
        clearInterval(this.refreshTimer!);
        this.startAutoRefresh();
      } else {
        this.fetchAllQuotes();
      }
    }, interval);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getCachedQuotes(): StockQuote[] {
    return this.cachedQuotes;
  }
}

export default StockEngine;
