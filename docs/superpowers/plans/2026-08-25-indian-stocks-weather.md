# Indian Stocks Engine + Chennai Weather Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live Indian stock market data (NSE/BSE indices, sector breakdown, personal watchlist) and a full Chennai weather dashboard with AQI to JARVIS.

**Architecture:** Yahoo Finance India API for stock quotes (free, no key), OpenWeatherMap + WAQI for Chennai weather. Backend modules in `electron/modules/` emit events via the event bus. IPC handlers in `electron/main.ts` bridge to the renderer. React components consume data via Zustand store.

**Tech Stack:** TypeScript, Electron, React 18, Zustand, Tailwind CSS, Yahoo Finance v8 API, OpenWeatherMap API, WAQI API, TradingView Lightweight Charts

## Global Constraints

- TypeScript strict mode enabled
- Tailwind CSS for all styling (no inline styles except dynamic values)
- Glassmorphism cards use `.glass-card` + `.neon-border` CSS classes
- All colors use the jarvis-* Tailwind palette (cyan: `#00d4ff`, gold: `#ffd700`, bg: `#0a0a0a`)
- Fonts: Orbitron (titles), Rajdhani (body), JetBrains Mono (code/values)
- API keys stored in `electron/.env` (not committed)
- Max 3 concurrent API requests per service
- Market hours: 9:15 AM - 3:30 PM IST, Mon-Fri

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/types.ts` | **Create** | Shared TypeScript interfaces (StockQuote, WeatherData, etc.) |
| `src/lib/api.ts` | **Create** | Renderer-side IPC helpers for stock + weather data |
| `electron/modules/stock-engine.ts` | **Rewrite** | Yahoo Finance India API, Indian symbols, market hours detection |
| `electron/modules/weather-service.ts` | **Rewrite** | OpenWeatherMap + WAQI for Chennai, AQI, 5-day forecast |
| `electron/modules/event-bus.ts` | **Edit** | Add stock/weather event type documentation |
| `electron/main.ts` | **Edit** | Wire up stock + weather IPC handlers, instantiate modules |
| `electron/preload.ts` | **Edit** | Expose stock + weather IPC channels to renderer |
| `src/lib/store.ts` | **Edit** | Add Indian stocks + weather state + actions |
| `src/components/IndexCard.tsx` | **Create** | Index summary card with sparkline SVG |
| `src/components/StockCard.tsx` | **Create** | Stock watchlist card component |
| `src/components/WeatherWidget.tsx` | **Create** | Compact weather card for Dashboard |
| `src/pages/Stocks.tsx` | **Rewrite** | Indian indices, sector breakdown, TradingView chart, watchlist |
| `src/pages/Weather.tsx` | **Create** | Full weather dashboard page |
| `src/pages/Dashboard.tsx` | **Rewrite** | Live Nifty/Sensex cards, stock watchlist, weather widget |
| `src/App.tsx` | **Edit** | Add Weather route + nav item |

---

### Task 1: Shared Types

**Files:**
- Create: `src/lib/types.ts`

**Interfaces Produced:**
- `StockQuote` — used by Tasks 2, 5, 6, 7, 8
- `WeatherData`, `HourlyForecast`, `DailyForecast` — used by Tasks 3, 5, 6, 7, 9
- `AQIData` — used by Tasks 3, 9

- [ ] **Step 1: Create types file**

```typescript
// src/lib/types.ts

export interface StockQuote {
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
  marketCap?: number;
  pe?: number;
  timestamp: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  rainChance: number;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainChance: number;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  pressure: number;
  condition: string;
  conditionIcon: string;
  conditionEmoji: string;
  uvIndex: number;
  uvLevel: string;
  aqi: number;
  aqiLevel: string;
  aqiColor: string;
  aqiAdvice: string;
  sunrise: string;
  sunset: string;
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];
  timestamp: number;
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add src/lib/types.ts && git commit -m "feat: add shared TypeScript interfaces for stocks and weather"
```

---

### Task 2: Stock Engine (Backend)

**Files:**
- Rewrite: `electron/modules/stock-engine.ts`

**Consumes:** `StockQuote` from Task 1
**Produces:** `fetchQuotes()`, `fetchIndices()`, `fetchSectorIndices()`, `getMarketStatus()`, `addToWatchlist()`, `removeFromWatchlist()` — used by Tasks 5, 6

- [ ] **Step 1: Define constants and interfaces**

```typescript
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
```

- [ ] **Step 2: Implement StockEngine class with Yahoo Finance fetch**

```typescript
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

      const quoteMeta = data.chart?.result?.[0]?.meta || {};
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
```

- [ ] **Step 3: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors (may need to adjust for module resolution)

- [ ] **Step 4: Commit**

```bash
cd jarvis && git add electron/modules/stock-engine.ts && git commit -m "feat: rewrite stock engine for Yahoo Finance India with NSE/BSE indices"
```

---

### Task 3: Weather Service (Backend)

**Files:**
- Rewrite: `electron/modules/weather-service.ts`

**Consumes:** `WeatherData`, `HourlyForecast`, `DailyForecast` from Task 1
**Produces:** `fetchCurrentWeather()`, `fetchAQI()`, `startAutoRefresh()` — used by Tasks 5, 6

- [ ] **Step 1: Implement WeatherService class**

```typescript
// electron/modules/weather-service.ts
import { EventEmitter } from 'events';

const CHENNAI_CONFIG = {
  city: 'Chennai',
  country: 'IN',
  lat: 13.0827,
  lon: 80.2707,
  timezone: 'Asia/Kolkata',
};

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  pressure: number;
  condition: string;
  conditionIcon: string;
  conditionEmoji: string;
  uvIndex: number;
  uvLevel: string;
  aqi: number;
  aqiLevel: string;
  aqiColor: string;
  aqiAdvice: string;
  sunrise: string;
  sunset: string;
  hourlyForecast: Array<{ time: string; temp: number; condition: string; icon: string; rainChance: number }>;
  dailyForecast: Array<{ date: string; high: number; low: number; condition: string; icon: string; rainChance: number }>;
  timestamp: number;
}

function getConditionEmoji(iconCode: string): string {
  const emojiMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '🌤️', '02n': '☁️',
    '03d': '⛅', '03n': '⛅',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return emojiMap[iconCode] || '🌡️';
}

function getAQILevel(aqi: number): { level: string; color: string; advice: string } {
  if (aqi <= 50) return { level: 'Good', color: '#00e676', advice: 'Air quality is satisfactory. Enjoy outdoor activities.' };
  if (aqi <= 100) return { level: 'Moderate', color: '#ffeb3b', advice: 'Acceptable quality. Unusually sensitive people should limit prolonged outdoor exertion.' };
  if (aqi <= 200) return { level: 'Poor', color: '#ff9800', advice: 'Unhealthy for sensitive groups. Limit prolonged outdoor exertion.' };
  if (aqi <= 300) return { level: 'Very Poor', color: '#f44336', advice: 'Health alert. Everyone may experience serious health effects. Avoid outdoor activities.' };
  return { level: 'Hazardous', color: '#880e4f', advice: 'Emergency conditions. The entire population is affected. Stay indoors.' };
}

function getUVLevel(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function windDegToDirection(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

class WeatherService {
  private eventBus: EventEmitter;
  private apiKey: string = '';
  private waqiToken: string = '';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private aqiTimer: ReturnType<typeof setInterval> | null = null;
  private cachedData: WeatherData | null = null;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('weather:refresh', () => this.fetchCurrentWeather());
  }

  setApiKey(key: string): void { this.apiKey = key; }
  setWAQIToken(token: string): void { this.waqiToken = token; }

  async fetchCurrentWeather(): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('[Weather] No API key configured');
      return null;
    }

    try {
      // Current weather
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CHENNAI_CONFIG.city},${CHENNAI_CONFIG.country}&units=metric&appid=${this.apiKey}`;
      const currentRes = await fetch(currentUrl);
      if (!currentRes.ok) throw new Error(`OWM error: ${currentRes.status}`);
      const current = await currentRes.json();

      // 5-day forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${CHENNAI_CONFIG.city},${CHENNAI_CONFIG.country}&units=metric&appid=${this.apiKey}`;
      const forecastRes = await fetch(forecastUrl);
      const forecast = forecastRes.ok ? await forecastRes.json() : null;

      // UV index
      const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${CHENNAI_CONFIG.lat}&lon=${CHENNAI_CONFIG.lon}&appid=${this.apiKey}`;
      const uvRes = await fetch(uvUrl);
      const uvData = uvRes.ok ? await uvRes.json() : { value: 0 };

      // AQI
      const aqiData = await this.fetchAQI();

      // Parse hourly forecast (next 12 hours)
      const hourlyForecast = [];
      if (forecast?.list) {
        for (let i = 0; i < Math.min(12, forecast.list.length); i++) {
          const item = forecast.list[i];
          hourlyForecast.push({
            time: item.dt_txt,
            temp: Math.round(item.main.temp),
            condition: item.weather[0]?.description || '',
            icon: item.weather[0]?.icon || '01d',
            rainChance: Math.round((item.pop || 0) * 100),
          });
        }
      }

      // Parse daily forecast (next 5 days)
      const dailyMap = new Map<string, any>();
      if (forecast?.list) {
        for (const item of forecast.list) {
          const date = item.dt_txt.split(' ')[0];
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { high: item.main.temp_max, low: item.main.temp_min, condition: item.weather[0]?.description, icon: item.weather[0]?.icon, rainChance: Math.round((item.pop || 0) * 100) });
          } else {
            const existing = dailyMap.get(date);
            existing.high = Math.max(existing.high, item.main.temp_max);
            existing.low = Math.min(existing.low, item.main.temp_min);
          }
        }
      }

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyForecast = Array.from(dailyMap.entries()).slice(0, 5).map(([dateStr, data]) => {
        const d = new Date(dateStr);
        return {
          date: dayNames[d.getDay()],
          high: Math.round(data.high),
          low: Math.round(data.low),
          condition: data.condition,
          icon: data.icon,
          rainChance: data.rainChance,
        };
      });

      const aqiLevel = getAQILevel(aqiData.aqi);

      const weatherData: WeatherData = {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed * 3.6), // m/s to km/h
        windDirection: windDegToDirection(current.wind.deg || 0),
        visibility: Math.round((current.visibility || 10000) / 1000),
        pressure: current.main.pressure,
        condition: current.weather[0]?.description || 'Unknown',
        conditionIcon: current.weather[0]?.icon || '01d',
        conditionEmoji: getConditionEmoji(current.weather[0]?.icon || '01d'),
        uvIndex: Math.round(uvData.value || 0),
        uvLevel: getUVLevel(uvData.value || 0),
        aqi: aqiData.aqi,
        aqiLevel: aqiLevel.level,
        aqiColor: aqiLevel.color,
        aqiAdvice: aqiLevel.advice,
        sunrise: new Date(current.sys.sunrise * 1000).toISOString(),
        sunset: new Date(current.sys.sunset * 1000).toISOString(),
        hourlyForecast,
        dailyForecast,
        timestamp: Date.now(),
      };

      this.cachedData = weatherData;
      this.eventBus.emit('weather:update', weatherData);
      return weatherData;
    } catch (error: any) {
      console.error('[Weather] Fetch failed:', error.message);
      this.eventBus.emit('weather:error', error.message);
      return this.cachedData;
    }
  }

  async fetchAQI(): Promise<{ aqi: number; level: string }> {
    if (!this.waqiToken) return { aqi: 0, level: 'Unknown' };
    try {
      const url = `https://api.waqi.info/feed/chennai/?token=${this.waqiToken}`;
      const res = await fetch(url);
      if (!res.ok) return { aqi: 0, level: 'Unknown' };
      const data = await res.json();
      return { aqi: data.data?.aqi || 0, level: '' };
    } catch {
      return { aqi: 0, level: 'Unknown' };
    }
  }

  startAutoRefresh(): void {
    this.fetchCurrentWeather();
    this.refreshTimer = setInterval(() => this.fetchCurrentWeather(), 30 * 60 * 1000);
    this.aqiTimer = setInterval(() => this.fetchAQI(), 60 * 60 * 1000);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    if (this.aqiTimer) { clearInterval(this.aqiTimer); this.aqiTimer = null; }
  }

  getCachedData(): WeatherData | null {
    return this.cachedData;
  }
}

export default WeatherService;
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add electron/modules/weather-service.ts && git commit -m "feat: rewrite weather service for Chennai with AQI and 5-day forecast"
```

---

### Task 4: IPC Bridge (Preload + Main)

**Files:**
- Edit: `electron/preload.ts`
- Edit: `electron/main.ts`

**Produces:** IPC channels for stock + weather — used by Tasks 5, 6

- [ ] **Step 1: Add stock IPC handlers to main.ts**

Add to `electron/main.ts` in `setupIPC()`:

```typescript
  // ── Stock Engine ──
  ipcMain.handle('stock:get-quotes', async (_event, symbols: string[]) => {
    if (!stockEngine) return [];
    return stockEngine.fetchQuotes(symbols);
  });

  ipcMain.handle('stock:get-indices', async () => {
    if (!stockEngine) return [];
    return stockEngine.fetchIndices();
  });

  ipcMain.handle('stock:get-sectors', async () => {
    if (!stockEngine) return [];
    return stockEngine.fetchSectorIndices();
  });

  ipcMain.handle('stock:market-status', () => {
    if (!stockEngine) return 'closed';
    return stockEngine.getMarketStatus();
  });

  ipcMain.handle('stock:watchlist-add', async (_event, data: { name: string; symbol: string }) => {
    if (!stockEngine) return;
    stockEngine.addToWatchlist(data.name, data.symbol);
  });

  ipcMain.handle('stock:watchlist-remove', async (_event, symbol: string) => {
    if (!stockEngine) return;
    stockEngine.removeFromWatchlist(symbol);
  });

  // ── Weather Service ──
  ipcMain.handle('weather:get', async () => {
    if (!weatherService) return null;
    return weatherService.fetchCurrentWeather();
  });

  ipcMain.handle('weather:refresh', async () => {
    if (!weatherService) return null;
    return weatherService.fetchCurrentWeather();
  });
```

- [ ] **Step 2: Add stock/weather module initialization to app.whenReady()**

Add to `electron/main.ts` in `app.whenReady()`:

```typescript
  const { default: StockEngine } = await import('./modules/stock-engine');
  const { default: WeatherService } = await import('./modules/weather-service');

  stockEngine = new StockEngine(eventBus);
  weatherService = new WeatherService(eventBus);

  // Load API keys from env
  weatherService.setApiKey(process.env.OPENWEATHER_API_KEY || '');
  weatherService.setWAQIToken(process.env.WAQI_TOKEN || '');

  // Wire up events to renderer
  eventBus.on('stock:update', (data: any[]) => {
    mainWindow?.webContents.send('stock:update', data);
  });

  eventBus.on('weather:update', (data: any) => {
    mainWindow?.webContents.send('weather:update', data);
  });

  eventBus.on('weather:error', (error: string) => {
    mainWindow?.webContents.send('weather:error', error);
  });

  // Start auto-refresh
  stockEngine.startAutoRefresh();
  weatherService.startAutoRefresh();
```

Add variable declarations at top:
```typescript
let stockEngine: any;
let weatherService: any;
```

- [ ] **Step 3: Add preload IPC channels**

Add to `electron/preload.ts` inside `electronAPI`:

```typescript
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
```

- [ ] **Step 4: Update vite-env.d.ts**

Add to the `ElectronAPI` interface in `src/vite-env.d.ts`:

```typescript
  stock: {
    getQuotes: (symbols: string[]) => Promise<any[]>;
    getIndices: () => Promise<any[]>;
    getSectors: () => Promise<any[]>;
    getMarketStatus: () => Promise<string>;
    watchlistAdd: (data: { name: string; symbol: string }) => Promise<void>;
    watchlistRemove: (symbol: string) => Promise<void>;
    onUpdate: (callback: (data: any[]) => void) => void;
  };
  weather: {
    get: () => Promise<any>;
    refresh: () => Promise<any>;
    onUpdate: (callback: (data: any) => void) => void;
    onError: (callback: (error: string) => void) => void;
  };
```

- [ ] **Step 5: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
cd jarvis && git add electron/main.ts electron/preload.ts src/vite-env.d.ts && git commit -m "feat: add IPC bridge for stock engine and weather service"
```

---

### Task 5: Zustand Store

**Files:**
- Edit: `src/lib/store.ts`

**Consumes:** `StockQuote`, `WeatherData` from Task 1
**Produces:** Store state + actions — used by Tasks 6, 7, 8, 9

- [ ] **Step 1: Add imports and new state fields**

Add to `src/lib/store.ts`:

```typescript
import type { StockQuote, WeatherData } from './types';

interface JarvisState {
  // ... existing fields ...

  // ── Indian Stocks ──
  indianIndices: StockQuote[];
  sectorIndices: StockQuote[];
  stockWatchlist: StockQuote[];
  stockMarketStatus: 'open' | 'closed' | 'pre-market' | 'post-market';

  // ── Weather ──
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;

  // ── Actions ──
  // ... existing actions ...
  setIndianIndices: (indices: StockQuote[]) => void;
  setSectorIndices: (sectors: StockQuote[]) => void;
  setStockWatchlist: (stocks: StockQuote[]) => void;
  setStockMarketStatus: (status: 'open' | 'closed' | 'pre-market' | 'post-market') => void;
  setWeather: (weather: WeatherData) => void;
  setWeatherLoading: (v: boolean) => void;
  setWeatherError: (error: string | null) => void;
}
```

- [ ] **Step 2: Add initial state and actions**

Add to the `create()` call:

```typescript
  // Initial state additions
  indianIndices: [],
  sectorIndices: [],
  stockWatchlist: [],
  stockMarketStatus: 'closed',
  weather: null,
  weatherLoading: false,
  weatherError: null,

  // Action additions
  setIndianIndices: (indices) => set({ indianIndices: indices }),
  setSectorIndices: (sectors) => set({ sectorIndices: sectors }),
  setStockWatchlist: (stocks) => set({ stockWatchlist: stocks }),
  setStockMarketStatus: (status) => set({ stockMarketStatus: status }),
  setWeather: (weather) => set({ weather, weatherError: null }),
  setWeatherLoading: (v) => set({ weatherLoading: v }),
  setWeatherError: (error) => set({ weatherError: error }),
```

- [ ] **Step 3: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd jarvis && git add src/lib/store.ts && git commit -m "feat: add Indian stocks and weather state to Zustand store"
```

---

### Task 6: API Helpers (Renderer)

**Files:**
- Create: `src/lib/api.ts`

**Consumes:** IPC channels from Task 4
**Produces:** `fetchIndianIndices()`, `fetchStockWatchlist()`, `fetchChennaiWeather()` — used by Tasks 7, 8, 9

- [ ] **Step 1: Create API helper functions**

```typescript
// src/lib/api.ts
import { useJarvisStore } from './store';

export async function fetchIndianIndices(): Promise<void> {
  const { setIndianIndices } = useJarvisStore.getState();
  if (!window.electronAPI) return;

  try {
    const indices = await window.electronAPI.stock.getIndices();
    setIndianIndices(indices);
  } catch (err) {
    console.error('[API] Failed to fetch indices:', err);
  }
}

export async function fetchSectorIndices(): Promise<void> {
  const { setSectorIndices } = useJarvisStore.getState();
  if (!window.electronAPI) return;

  try {
    const sectors = await window.electronAPI.stock.getSectors();
    setSectorIndices(sectors);
  } catch (err) {
    console.error('[API] Failed to fetch sectors:', err);
  }
}

export async function fetchStockWatchlist(): Promise<void> {
  const { setStockWatchlist, setStockMarketStatus } = useJarvisStore.getState();
  if (!window.electronAPI) return;

  try {
    const [watchlist, status] = await Promise.all([
      window.electronAPI.stock.getQuotes([
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
        'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'LT.NS', 'TATAMOTORS.NS',
      ]),
      window.electronAPI.stock.getMarketStatus(),
    ]);
    setStockWatchlist(watchlist);
    setStockMarketStatus(status as any);
  } catch (err) {
    console.error('[API] Failed to fetch watchlist:', err);
  }
}

export async function fetchChennaiWeather(): Promise<void> {
  const { setWeather, setWeatherLoading, setWeatherError } = useJarvisStore.getState();
  if (!window.electronAPI) return;

  setWeatherLoading(true);
  try {
    const data = await window.electronAPI.weather.get();
    if (data) {
      setWeather(data);
    }
  } catch (err: any) {
    setWeatherError(err.message);
  } finally {
    setWeatherLoading(false);
  }
}

export function setupRealtimeListeners(): void {
  if (!window.electronAPI) return;

  window.electronAPI.stock.onUpdate((data) => {
    const { setIndianIndices, setSectorIndices, setStockWatchlist } = useJarvisStore.getState();
    // Categorize received quotes
    const indexSymbols = ['^NSEI', '^BSESN', '^NSEBANK'];
    const sectorSymbols = ['^CNXIT', '^CNXPHARMA', '^CNXAUTO', '^CNXFMCG', '^CNXMETAL', '^CNXREALTY', '^NSEMDCP50'];

    const indices = data.filter((q: any) => indexSymbols.includes(q.symbol));
    const sectors = data.filter((q: any) => sectorSymbols.includes(q.symbol));
    const stocks = data.filter((q: any) => !indexSymbols.includes(q.symbol) && !sectorSymbols.includes(q.symbol));

    setIndianIndices(indices);
    setSectorIndices(sectors);
    setStockWatchlist(stocks);
  });

  window.electronAPI.weather.onUpdate((data) => {
    useJarvisStore.getState().setWeather(data);
  });

  window.electronAPI.weather.onError((error) => {
    useJarvisStore.getState().setWeatherError(error);
  });
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add src/lib/api.ts && git commit -m "feat: add renderer-side API helpers for stocks and weather"
```

---

### Task 7: IndexCard Component

**Files:**
- Create: `src/components/IndexCard.tsx`

**Consumes:** `StockQuote` from Task 1
**Produces:** `IndexCard` component — used by Tasks 10, 11

- [ ] **Step 1: Create IndexCard component**

```typescript
// src/components/IndexCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockQuote } from '../lib/types';

interface IndexCardProps {
  data: StockQuote;
  compact?: boolean;
}

export default function IndexCard({ data, compact = false }: IndexCardProps) {
  const isUp = data.changePercent >= 0;

  return (
    <div className={`glass-card neon-border p-4 ${compact ? 'py-3' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-hud text-[0.65rem] tracking-[0.15em] text-jarvis-cyan uppercase">
          {data.name}
        </h3>
        <div className={`flex items-center gap-1 font-mono text-xs ${isUp ? 'text-green-400' : 'text-jarvis-arc'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isUp ? '+' : ''}{data.changePercent}%
        </div>
      </div>

      <p className={`font-mono ${compact ? 'text-lg' : 'text-2xl'} text-jarvis-text`}>
        {data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>

      {!compact && (
        <div className="flex items-center gap-3 mt-2 text-[0.6rem] font-mono text-jarvis-text-dim">
          <span>H: {data.dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span>L: {data.dayLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      )}

      {!compact && (
        <div className="mt-3 h-8">
          <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
            <path
              d={`M0,${isUp ? 25 : 5} Q25,${isUp ? 10 : 20} 50,${isUp ? 15 : 15} T100,${isUp ? 5 : 25}`}
              fill="none"
              stroke={isUp ? '#00ff88' : '#ff4444'}
              strokeWidth="1.5"
              opacity="0.6"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add src/components/IndexCard.tsx && git commit -m "feat: add IndexCard component with sparkline for market indices"
```

---

### Task 8: StockCard Component

**Files:**
- Create: `src/components/StockCard.tsx`

**Consumes:** `StockQuote` from Task 1
**Produces:** `StockCard` component — used by Tasks 10, 11

- [ ] **Step 1: Create StockCard component**

```typescript
// src/components/StockCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import type { StockQuote } from '../lib/types';

interface StockCardProps {
  data: StockQuote;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function StockCard({ data, selected = false, onClick, compact = false }: StockCardProps) {
  const isUp = data.changePercent >= 0;

  return (
    <button
      onClick={onClick}
      className={`glass-card p-3 text-left transition-all cursor-pointer ${
        selected
          ? 'neon-border border-jarvis-cyan/40'
          : 'neon-border hover:border-jarvis-cyan/30'
      } ${compact ? 'min-w-[140px]' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-jarvis-text font-medium">{data.symbol.replace('.NS', '')}</span>
        <Star size={10} className="text-jarvis-gold/30" />
      </div>

      <p className="font-mono text-sm text-jarvis-text">
        ₹{data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>

      <div className={`flex items-center gap-1 mt-1 font-mono text-xs ${isUp ? 'text-green-400' : 'text-jarvis-arc'}`}>
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? '+' : ''}{data.changePercent}%
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add src/components/StockCard.tsx && git commit -m "feat: add StockCard component for watchlist display"
```

---

### Task 9: WeatherWidget Component

**Files:**
- Create: `src/components/WeatherWidget.tsx`

**Consumes:** `WeatherData` from Task 1
**Produces:** `WeatherWidget` component — used by Task 11

- [ ] **Step 1: Create WeatherWidget component**

```typescript
// src/components/WeatherWidget.tsx
import React from 'react';
import { Cloud, Droplets, Wind, ArrowRight } from 'lucide-react';
import { useJarvisStore } from '../lib/store';

export default function WeatherWidget() {
  const { weather, weatherLoading, weatherError } = useJarvisStore();

  if (weatherLoading && !weather) {
    return (
      <div className="glass-card neon-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Cloud size={14} className="text-jarvis-cyan" />
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">Chennai Weather</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-jarvis-cyan/40 animate-spin" />
        </div>
      </div>
    );
  }

  if (weatherError || !weather) {
    return (
      <div className="glass-card neon-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Cloud size={14} className="text-jarvis-cyan" />
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">Chennai Weather</h2>
        </div>
        <p className="text-xs text-jarvis-text-dim text-center py-4">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="glass-card neon-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Cloud size={14} className="text-jarvis-cyan" />
        <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">Chennai Weather</h2>
      </div>

      {/* Main temp */}
      <div className="text-center mb-4">
        <p className="text-4xl">{weather.conditionEmoji}</p>
        <p className="font-mono text-3xl text-jarvis-cyan glow-text-cyan mt-2">{weather.temp}°C</p>
        <p className="text-sm text-jarvis-text mt-1">{weather.condition}</p>
        <p className="text-xs text-jarvis-text-dim">Feels like {weather.feelsLike}°C</p>
      </div>

      {/* AQI Badge */}
      {weather.aqi > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4 px-3 py-1.5 rounded-lg"
             style={{ background: `${weather.aqiColor}15`, border: `1px solid ${weather.aqiColor}30` }}>
          <span className="font-mono text-xs" style={{ color: weather.aqiColor }}>AQI {weather.aqi}</span>
          <span className="text-[0.6rem] text-jarvis-text-dim">{weather.aqiLevel}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-around pt-3 border-t border-jarvis-border">
        <div className="text-center">
          <Droplets size={12} className="text-jarvis-cyan/50 mx-auto mb-1" />
          <p className="font-mono text-xs text-jarvis-text">{weather.humidity}%</p>
          <p className="text-[0.55rem] text-jarvis-text-dim">Humidity</p>
        </div>
        <div className="text-center">
          <Wind size={12} className="text-jarvis-cyan/50 mx-auto mb-1" />
          <p className="font-mono text-xs text-jarvis-text">{weather.windSpeed} km/h</p>
          <p className="text-[0.55rem] text-jarvis-text-dim">{weather.windDirection}</p>
        </div>
      </div>

      {/* Mini forecast */}
      {weather.dailyForecast.length > 0 && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-jarvis-border">
          {weather.dailyForecast.slice(0, 3).map((day, i) => (
            <div key={i} className="flex-1 text-center">
              <p className="text-[0.55rem] text-jarvis-text-dim">{day.date}</p>
              <p className="text-sm my-0.5">{getConditionEmoji(day.icon)}</p>
              <p className="font-mono text-[0.6rem] text-jarvis-text">{day.high}°/{day.low}°</p>
            </div>
          ))}
        </div>
      )}

      {/* View All link */}
      <div className="text-center mt-3">
        <a href="#/weather" className="text-[0.65rem] text-jarvis-cyan/60 hover:text-jarvis-cyan flex items-center justify-center gap-1 transition-colors">
          View Full Weather <ArrowRight size={10} />
        </a>
      </div>
    </div>
  );
}

function getConditionEmoji(iconCode: string): string {
  const emojiMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '🌤️', '02n': '☁️',
    '03d': '⛅', '03n': '⛅', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return emojiMap[iconCode] || '🌡️';
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd jarvis && git add src/components/WeatherWidget.tsx && git commit -m "feat: add WeatherWidget compact card for Dashboard"
```

---

### Task 10: Stocks Page (Rewrite)

**Files:**
- Rewrite: `src/pages/Stocks.tsx`

**Consumes:** `IndexCard` from Task 7, `StockCard` from Task 8, store from Task 5, API from Task 6
**Produces:** Full Indian stocks page — used by Task 12

- [ ] **Step 1: Rewrite Stocks page with Indian indices and watchlist**

The full Stocks.tsx rewrite is large. Key sections:
- Header with "INDIAN STOCKS" title + market status badge
- 3 IndexCard components for Nifty 50, Sensex, Bank Nifty
- TradingView Lightweight Charts area (placeholder with `lightweight-charts` import)
- Watchlist sidebar with StockCard components
- Sector indices grid at bottom
- Use `useEffect` to call `fetchIndianIndices()`, `fetchSectorIndices()`, `fetchStockWatchlist()` on mount
- Use `useJarvisStore` to consume `indianIndices`, `sectorIndices`, `stockWatchlist`, `stockMarketStatus`

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify page renders in browser**

Run: `cd jarvis && npx vite preview --port 4173`
Open: http://localhost:4173/#/stocks
Expected: Indian Stocks page with index cards and watchlist (data may be empty without API keys, but layout should render)

- [ ] **Step 4: Commit**

```bash
cd jarvis && git add src/pages/Stocks.tsx && git commit -m "feat: rewrite Stocks page for Indian market with indices and sector breakdown"
```

---

### Task 11: Weather Page (New)

**Files:**
- Create: `src/pages/Weather.tsx`

**Consumes:** store from Task 5, API from Task 6
**Produces:** Full Chennai weather page — used by Task 12

- [ ] **Step 1: Create Weather page**

The Weather.tsx page includes:
- Hero section with large temp, condition, city name
- 4-column detail cards (Humidity, Wind, UV, Visibility)
- AQI section with color gauge
- Hourly forecast horizontal scroll
- 5-day forecast cards
- Sunrise/Sunset section
- Use `useEffect` to call `fetchChennaiWeather()` on mount
- Use `useJarvisStore` to consume `weather`, `weatherLoading`, `weatherError`

- [ ] **Step 2: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify page renders in browser**

Run: `cd jarvis && npx vite preview --port 4173`
Open: http://localhost:4173/#/weather
Expected: Weather page with layout (data may be empty without API keys)

- [ ] **Step 4: Commit**

```bash
cd jarvis && git add src/pages/Weather.tsx && git commit -m "feat: add full Weather page for Chennai with AQI and forecasts"
```

---

### Task 12: Dashboard Integration

**Files:**
- Rewrite: `src/pages/Dashboard.tsx`
- Edit: `src/App.tsx`

**Consumes:** All components from Tasks 7-9, store from Task 5, API from Task 6
**Produces:** Updated Dashboard with live data + Weather nav item

- [ ] **Step 1: Add Weather to navigation in App.tsx**

Add to `navItems` array in `src/App.tsx`:

```typescript
import { Cloud } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/stocks', label: 'Stocks', icon: TrendingUp },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/weather', label: 'Weather', icon: Cloud },
  { path: '/files', label: 'Files', icon: FolderOpen },
  { path: '/habits', label: 'Habits', icon: CheckSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];
```

Add lazy import:
```typescript
const Weather = React.lazy(() => import('./pages/Weather'));
```

Add route:
```typescript
<Route path="/weather" element={<Weather />} />
```

- [ ] **Step 2: Rewrite Dashboard with live data sections**

Key changes to Dashboard.tsx:
- Import `IndexCard`, `StockCard`, `WeatherWidget`
- Import `fetchIndianIndices`, `fetchStockWatchlist`, `fetchChennaiWeather` from `../lib/api`
- Use `useEffect` to fetch data on mount
- Morning briefing: Include Nifty movement + Chennai temp
- Top Indices section: 3 IndexCard components
- Stock Watchlist section: Horizontal scroll of StockCard components with "View All →" link
- Weather section: Replace old weather card with `WeatherWidget`
- Keep News, Habits, System Status unchanged

- [ ] **Step 3: Verify build passes**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify full app renders in browser**

Run: `cd jarvis && npx vite preview --port 4173`
Open: http://localhost:4173/#/
Expected: Dashboard with index cards, stock watchlist, and weather widget

- [ ] **Step 5: Commit**

```bash
cd jarvis && git add src/pages/Dashboard.tsx src/App.tsx && git commit -m "feat: integrate live Indian stocks and Chennai weather into Dashboard"
```

---

### Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `cd jarvis && npx vite build`
Expected: Clean build with no errors

- [ ] **Step 2: Type check**

Run: `cd jarvis && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Manual smoke test**

Run: `cd jarvis && npx vite preview --port 4173`
Verify:
- Dashboard loads with index cards, stock watchlist, weather widget
- Stocks page shows Indian indices and sector breakdown
- Weather page shows Chennai weather layout
- Navigation includes Weather link
- All pages transition smoothly

- [ ] **Step 4: Final commit**

```bash
cd jarvis && git add -A && git commit -m "feat: complete Indian Stocks Engine + Chennai Weather Dashboard"
```
