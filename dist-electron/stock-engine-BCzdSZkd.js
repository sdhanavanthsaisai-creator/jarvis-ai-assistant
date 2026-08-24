"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const INDEX_SYMBOLS = {
  "NIFTY 50": "^NSEI",
  "SENSEX": "^BSESN",
  "BANK NIFTY": "^NSEBANK"
};
const SECTOR_SYMBOLS = {
  "NIFTY IT": "^CNXIT",
  "NIFTY PHARMA": "^CNXPHARMA",
  "NIFTY AUTO": "^CNXAUTO",
  "NIFTY FMCG": "^CNXFMCG",
  "NIFTY METAL": "^CNXMETAL",
  "NIFTY REALTY": "^CNXREALTY",
  "NIFTY MIDCAP 50": "^NSEMDCP50"
};
const DEFAULT_WATCHLIST = [
  { name: "Reliance", symbol: "RELIANCE.NS" },
  { name: "TCS", symbol: "TCS.NS" },
  { name: "HDFC Bank", symbol: "HDFCBANK.NS" },
  { name: "Infosys", symbol: "INFY.NS" },
  { name: "ICICI Bank", symbol: "ICICIBANK.NS" },
  { name: "SBI", symbol: "SBIN.NS" },
  { name: "Bharti Airtel", symbol: "BHARTIARTL.NS" },
  { name: "ITC", symbol: "ITC.NS" },
  { name: "L&T", symbol: "LT.NS" },
  { name: "Tata Motors", symbol: "TATAMOTORS.NS" }
];
class StockEngine {
  constructor(eventBus) {
    __publicField(this, "eventBus");
    __publicField(this, "watchlist", [...DEFAULT_WATCHLIST]);
    __publicField(this, "refreshTimer", null);
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("stock:refresh", () => this.fetchAllQuotes());
    this.eventBus.on("stock:add-symbol", (data) => {
      if (!this.watchlist.find((s) => s.symbol === data.symbol)) {
        this.watchlist.push(data);
      }
    });
    this.eventBus.on("stock:remove-symbol", (symbol) => {
      this.watchlist = this.watchlist.filter((s) => s.symbol !== symbol);
    });
  }
  async fetchQuotes(symbols) {
    const quotes = [];
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((symbol) => this.fetchSingleQuote(symbol))
      );
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          quotes.push(result.value);
        }
      }
    }
    return quotes;
  }
  async fetchSingleQuote(symbol) {
    var _a, _b;
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (!response.ok) return null;
      const data = await response.json();
      const result = (_b = (_a = data.chart) == null ? void 0 : _a.result) == null ? void 0 : _b[0];
      if (!result) return null;
      const meta = result.meta;
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose ? change / prevClose * 100 : 0;
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
        timestamp: Date.now()
      };
    } catch (err) {
      console.warn(`[Stock] Failed to fetch ${symbol}:`, err.message);
      return null;
    }
  }
  async fetchAllQuotes() {
    const allSymbols = [
      ...Object.values(INDEX_SYMBOLS),
      ...Object.values(SECTOR_SYMBOLS),
      ...this.watchlist.map((s) => s.symbol)
    ];
    const quotes = await this.fetchQuotes(allSymbols);
    this.eventBus.emit("stock:update", quotes);
  }
  async fetchIndices() {
    const symbols = Object.values(INDEX_SYMBOLS);
    return this.fetchQuotes(symbols);
  }
  async fetchSectorIndices() {
    const symbols = Object.values(SECTOR_SYMBOLS);
    return this.fetchQuotes(symbols);
  }
  getMarketStatus() {
    const now = /* @__PURE__ */ new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = ist.getDay();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    if (day === 0 || day === 6) return "closed";
    if (timeInMinutes >= 555 && timeInMinutes < 930) return "open";
    if (timeInMinutes >= 375 && timeInMinutes < 555) return "pre-market";
    if (timeInMinutes >= 930 && timeInMinutes < 1005) return "post-market";
    return "closed";
  }
  addToWatchlist(name, symbol) {
    if (!this.watchlist.find((s) => s.symbol === symbol)) {
      this.watchlist.push({ name, symbol });
    }
  }
  removeFromWatchlist(symbol) {
    this.watchlist = this.watchlist.filter((s) => s.symbol !== symbol);
  }
  startAutoRefresh() {
    this.fetchAllQuotes();
    this.refreshTimer = setInterval(() => this.fetchAllQuotes(), 5 * 60 * 1e3);
  }
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
exports.default = StockEngine;
