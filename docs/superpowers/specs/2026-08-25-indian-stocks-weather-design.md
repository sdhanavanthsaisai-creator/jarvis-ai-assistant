# Indian Stocks Engine + Chennai Weather Dashboard

**Date:** 2026-08-25
**Status:** Approved
**Scope:** Two features — Indian stock market data + Chennai weather dashboard

---

## 1. Overview

Add live Indian stock market data (NSE/BSE indices, sector breakdown, personal watchlist) and a full Chennai weather dashboard with AQI to JARVIS. Both features integrate into the existing Dashboard page and get dedicated full pages.

**Approach:** Yahoo Finance India (free, `.NS` suffix) + OpenWeatherMap + WAQI (free tiers).

---

## 2. Indian Stocks Engine

### 2.1 Data Layer

**File:** `electron/modules/stock-engine.ts` (rewrite existing)

**Yahoo Finance API:**
- Base URL: `https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}`
- No API key required
- Rate limit: ~2000 requests/hour (adequate for 5-min refresh)

**Symbols — Indices:**

| Display Name | Yahoo Symbol | Type |
|---|---|---|
| Nifty 50 | `^NSEI` | Index |
| Sensex | `^BSESN` | Index |
| Bank Nifty | `^NSEBANK` | Sector Index |
| Nifty IT | `^CNXIT` | Sector Index |
| Nifty Pharma | `^CNXPHARMA` | Sector Index |
| Nifty Auto | `^CNXAUTO` | Sector Index |
| Nifty FMCG | `^CNXFMCG` | Sector Index |
| Nifty Metal | `^CNXMETAL` | Sector Index |
| Nifty Realty | `^CNXREALTY` | Sector Index |
| Nifty Midcap 50 | `^NSEMDCP50` | Index |

**Symbols — Personal Watchlist:**

| Display Name | Yahoo Symbol |
|---|---|
| Reliance | `RELIANCE.NS` |
| TCS | `TCS.NS` |
| HDFC Bank | `HDFCBANK.NS` |
| Infosys | `INFY.NS` |
| ICICI Bank | `ICICIBANK.NS` |
| SBI | `SBIN.NS` |
| Bharti Airtel | `BHARTIARTL.NS` |
| ITC | `ITC.NS` |
| L&T | `LT.NS` |
| Tata Motors | `TATAMOTORS.NS` |

**Data Returned Per Symbol:**

```typescript
interface StockQuote {
  symbol: string;
  name: string;
  price: number;           // Current price in ₹
  change: number;          // Day change in ₹
  changePercent: number;   // Day change in %
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  volume: number;
  marketCap?: number;      // For stocks only
  pe?: number;             // For stocks only
  timestamp: number;
}
```

**Refresh Strategy:**
- **Market hours (9:15 AM - 3:30 PM IST, Mon-Fri):** Auto-refresh every 5 minutes
- **Outside market hours:** Fetch once on load, then every 30 minutes
- **Manual refresh:** Button available on Stocks page
- **Concurrent requests:** Max 3 simultaneous API calls, rest queued

### 2.2 Backend Module

**Class:** `StockEngine`

```typescript
class StockEngine {
  private eventBus: EventEmitter;
  private watchlist: string[];
  private indexSymbols: string[];
  private sectorSymbols: string[];
  private refreshTimer: ReturnType<typeof setInterval> | null;

  // Public API
  async fetchQuotes(symbols: string[]): Promise<StockQuote[]>;
  async fetchIndices(): Promise<StockQuote[]>;
  async fetchSectorIndices(): Promise<StockQuote[]>;
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
  getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'post-market';
  addToWatchlist(symbol: string): void;
  removeFromWatchlist(symbol: string): void;
}
```

**Event Bus Events:**
- `stock:update` — Emitted with all quotes after fetch
- `stock:refresh` — Trigger manual refresh
- `stock:add-symbol` — Add to watchlist
- `stock:remove-symbol` — Remove from watchlist

### 2.3 IPC Handlers

Added to `electron/main.ts`:

| Channel | Direction | Payload |
|---|---|---|
| `stock:get-quotes` | Renderer → Main | `{ symbols: string[] }` |
| `stock:get-indices` | Renderer → Main | none |
| `stock:get-sectors` | Renderer → Main | none |
| `stock:market-status` | Renderer → Main | none |
| `stock:update` | Main → Renderer | `StockQuote[]` (push) |
| `stock:watchlist-add` | Renderer → Main | `{ symbol: string }` |
| `stock:watchlist-remove` | Renderer → Main | `{ symbol: string }` |

### 2.4 UI — Stocks Page

**File:** `src/pages/Stocks.tsx` (rewrite)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  INDIAN STOCKS                     [Search] [+] │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ NIFTY 50 │ │ SENSEX   │ │BANK NIFTY│        │
│  │ 24,567   │ │ 80,234   │ │ 51,234   │        │
│  │ +0.82% ▲ │ │ +0.65% ▲ │ │ -0.2% ▼  │        │
│  │ ──────── │ │ ──────── │ │ ──────── │        │
│  │ ▁▂▃▄▅▆▇ │ │ ▁▂▃▄▅▆▇ │ │ ▇▆▅▄▃▂▁ │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  MAIN CHART AREA                                │
│  ┌─────────────────────────────┐ ┌───────────┐ │
│  │                             │ │ WATCHLIST │ │
│  │  [Candlestick Chart]        │ │ RELIANCE  │ │
│  │  [1D] [1W] [1M] [3M] [1Y]  │ │ TCS       │ │
│  │                             │ │ HDFC BANK │ │
│  │  [Volume Bars]              │ │ INFY      │ │
│  │                             │ │ ICICI     │ │
│  │  Price: ₹2,845 +1.2%       │ │ SBI       │ │
│  │  H: ₹2,878  L: ₹2,810     │ │ ...       │ │
│  │  52W H: ₹3,024  L: ₹2,220 │ │           │ │
│  └─────────────────────────────┘ └───────────┘ │
├─────────────────────────────────────────────────┤
│  SECTOR INDICES                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Bank Nif│ │Nifty IT│ │Pharma  │ │Auto    │  │
│  │51,234  │ │34,567  │ │18,901  │ │21,345  │  │
│  │-0.2% ▼ │ │+1.5% ▲ │ │+0.3% ▲ │ │-0.8% ▼ │  │
│  └────────┘ └────────┘ └────────┘ └────────┘  │
└─────────────────────────────────────────────────┘
```

**Top Bar:** Page title "INDIAN STOCKS", search input for symbols, add stock button

**Index Cards Row:** 3 major indices (Nifty 50, Sensex, Bank Nifty) as glassmorphism cards with:
- Index name (Orbitron font)
- Current value (JetBrains Mono, large)
- Change ₹ and % with up/down color
- Mini sparkline (1D trend, using SVG path)

**Chart Area:**
- Left (70%): TradingView Lightweight Charts candlestick chart
  - Timeframe selector: 1D, 1W, 1M, 3M, 1Y
  - Volume bars below chart
  - Selected stock name + price + change above chart
- Right (30%): Watchlist sidebar
  - Scrollable list of stocks with symbol, price, change %
  - Click to load chart
  - Star icon for favorites
  - Drag to reorder (future)

**Sector Breakdown Grid:** 2-4 columns of sector index cards (smaller than top indices), showing:
- Sector name, value, change %
- Color-coded border (green for up, red for down)

---

## 3. Chennai Weather Dashboard

### 3.1 Data Layer

**File:** `electron/modules/weather-service.ts` (rewrite existing)

**APIs:**

| API | Purpose | Free Tier | Key Required |
|---|---|---|---|
| OpenWeatherMap | Current weather, 5-day forecast, UV, sunrise/sunset | 1000 req/day | Yes (free signup) |
| WAQI | Air Quality Index for Chennai | 1000 req/day | Yes (free signup) |

**Chennai Config:**
```typescript
const CHENNAI_CONFIG = {
  city: 'Chennai',
  country: 'IN',
  lat: 13.0827,
  lon: 80.2707,
  timezone: 'Asia/Kolkata',
};
```

**Data Returned:**

```typescript
interface WeatherData {
  // Current
  temp: number;              // °C
  feelsLike: number;         // °C
  humidity: number;          // %
  windSpeed: number;         // km/h
  windDirection: string;     // N, NE, E, etc.
  visibility: number;        // km
  pressure: number;          // hPa
  condition: string;         // "Clear Sky", "Broken Clouds", etc.
  conditionIcon: string;     // OWM icon code
  conditionEmoji: string;    // ☀️, 🌤️, 🌧️, etc.

  // UV
  uvIndex: number;           // 0-11+
  uvLevel: string;           // "Low", "Moderate", "High", "Very High"

  // AQI
  aqi: number;               // 0-500
  aqiLevel: string;          // "Good", "Moderate", "Poor", "Very Poor", "Hazardous"
  aqiColor: string;          // green, yellow, orange, red, maroon
  aqiAdvice: string;         // Health advisory text

  // Sun
  sunrise: string;           // ISO timestamp
  sunset: string;            // ISO timestamp

  // Forecast
  hourlyForecast: HourlyForecast[];  // Next 12 hours
  dailyForecast: DailyForecast[];    // Next 5 days

  timestamp: number;
}

interface HourlyForecast {
  time: string;        // ISO timestamp
  temp: number;
  condition: string;
  icon: string;
  rainChance: number;  // %
}

interface DailyForecast {
  date: string;        // "Mon", "Tue", etc.
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainChance: number;  // %
}
```

**Refresh Strategy:**
- Weather: Auto-refresh every 30 minutes
- AQI: Auto-refresh every 60 minutes (separate API call)
- Manual refresh button available
- Fetch on app startup

### 3.2 Backend Module

**Class:** `WeatherService`

```typescript
class WeatherService {
  private eventBus: EventEmitter;
  private apiKey: string;
  private waqiToken: string;
  private refreshTimer: ReturnType<typeof setInterval> | null;
  private cachedData: WeatherData | null;

  // Public API
  async fetchCurrentWeather(): Promise<WeatherData>;
  async fetchForecast(): Promise<DailyForecast[]>;
  async fetchAQI(): Promise<{ aqi: number; level: string }>;
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
  getCachedData(): WeatherData | null;
}
```

**Event Bus Events:**
- `weather:update` — Emitted with full WeatherData after fetch
- `weather:refresh` — Trigger manual refresh
- `weather:error` — Emitted on fetch failure

### 3.3 IPC Handlers

Added to `electron/main.ts`:

| Channel | Direction | Payload |
|---|---|---|
| `weather:get` | Renderer → Main | none |
| `weather:get-forecast` | Renderer → Main | none |
| `weather:update` | Main → Renderer | `WeatherData` (push) |
| `weather:refresh` | Renderer → Main | none |

### 3.4 UI — Weather Page

**File:** `src/pages/Weather.tsx` (new)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  WEATHER — CHENNAI               [Refresh]      │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │  ☀️  31°C          Chennai, Tamil Nadu   │    │
│  │      Clear Sky      Feels like 36°C     │    │
│  │      H: 34°  L: 26°                     │    │
│  └─────────────────────────────────────────┘    │
├─────────┬─────────┬─────────┬───────────────────┤
│HUMIDITY │  WIND   │   UV    │  VISIBILITY       │
│  78%    │12 km/h  │ 8 High  │  10 km            │
│         │   NE    │         │                   │
├─────────┴─────────┴─────────┴───────────────────┤
│  AIR QUALITY INDEX                               │
│  ┌─────────────────────────────────────────┐    │
│  │  142   MODERATE 🟡                       │    │
│  │  ════════●═════════════════════════      │    │
│  │  0    50   100   200   300   500         │    │
│  │                                          │    │
│  │  "Unhealthy for sensitive groups.        │    │
│  │   Limit outdoor exertion."               │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  TODAY'S HOURS                                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │Now │ │10AM│ │11AM│ │12PM│ │1PM │ │2PM │    │
│  │☀️  │ │🌤️ │ │🌤️ │ │⛅ │ │🌧️│ │🌧️│    │
│  │31° │ │32° │ │33° │ │34° │ │33° │ │31° │    │
│  │0%  │ │5%  │ │10% │ │30% │ │60% │ │70% │    │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘    │
├─────────────────────────────────────────────────┤
│  5-DAY FORECAST                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ MON      │ │ TUE      │ │ WED      │        │
│  │ ☀️ 34/26│ │ 🌧️ 30/25│ │ ⛅ 31/26│        │
│  │ 10%      │ │ 80%       │ │ 40%       │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  SUNRISE / SUNSET                                │
│  ☀️ Rise: 06:12 AM    🌙 Set: 06:18 PM         │
│  Day length: 12h 6m                              │
└─────────────────────────────────────────────────┘
```

**Hero Section:** Large temperature, condition icon/emoji, city name, feels-like, high/low

**Detail Cards Grid:** 4-column row — Humidity, Wind (speed + direction), UV Index (with level color), Visibility

**AQI Section:** 
- Large AQI number with color-coded background
- Level text ("Moderate")
- Color gauge bar (0-500 scale with green→yellow→orange→red→maroon gradient)
- Health advisory text

**Hourly Forecast:** Horizontal scroll of next 12-24 hours with time, icon, temp, rain chance

**5-Day Forecast:** Horizontal cards with day name, icon, high/low temps, rain chance percentage

**Sunrise/Sunset:** Sunrise time, sunset time, day length calculation

### 3.5 AQI Color Scale

| AQI Range | Level | Color | Hex |
|---|---|---|---|
| 0-50 | Good | Green | `#00e676` |
| 51-100 | Moderate | Yellow | `#ffeb3b` |
| 101-200 | Poor | Orange | `#ff9800` |
| 201-300 | Very Poor | Red | `#f44336` |
| 301-500 | Hazardous | Maroon | `#880e4f` |

---

## 4. Dashboard Integration

### 4.1 Updated Dashboard

**File:** `src/pages/Dashboard.tsx` (rewrite)

**Section: Morning Briefing**
- Now includes: Nifty 50 movement + Chennai temperature + weather condition
- Example: "Good Morning, Sir. Nifty is up 0.82% at 24,567. Chennai is 31°C with clear skies. You have 3 meetings today."

**Section: Top Indices (replaces old "Markets")**
- 3 mini cards in a row: Nifty 50, Sensex, Bank Nifty
- Each shows: name, current value, change %, mini sparkline
- Color-coded: green border for up, red for down

**Section: Stock Watchlist (replaces old stock list)**
- Horizontal scrollable row of stock cards
- Each card: Symbol, price, change %, mini sparkline
- Click to navigate to full Stocks page
- Show top 5 from watchlist, with "View All →" link

**Section: Weather Widget (replaces old weather card)**
- Compact view: temp, condition icon, condition text
- AQI badge with color
- Humidity + Wind row
- 3-day mini forecast strip
- Click to navigate to full Weather page

**Sections unchanged:** News, Habits, System Status

### 4.2 Navigation Updates

**File:** `src/App.tsx`

Add Weather to sidebar navigation:
```
Dashboard → Chat → Stocks → News → Weather (NEW) → Files → Habits → Settings
```

Weather nav icon: `Cloud` from lucide-react

### 4.3 Zustand Store Updates

**File:** `src/lib/store.ts`

Add to state:
```typescript
// Indian Stocks
indianIndices: StockQuote[];
sectorIndices: StockQuote[];
stockWatchlist: StockQuote[];
stockMarketStatus: 'open' | 'closed' | 'pre-market' | 'post-market';

// Weather
weather: WeatherData | null;
weatherLoading: boolean;
```

Add actions:
```typescript
setIndianIndices: (indices: StockQuote[]) => void;
setSectorIndices: (sectors: StockQuote[]) => void;
setStockWatchlist: (stocks: StockQuote[]) => void;
setStockMarketStatus: (status: string) => void;
setWeather: (weather: WeatherData) => void;
setWeatherLoading: (v: boolean) => void;
```

---

## 5. Error Handling

| Failure | Behavior |
|---|---|
| Yahoo Finance API down | Show "Market data unavailable" banner on Stocks page + Dashboard. Show last cached values if available. |
| OpenWeatherMap API down | Show "Weather unavailable" banner. Hide weather card on Dashboard. |
| WAQI API down | Hide AQI card entirely (non-critical). Show "AQI data unavailable" in Weather page. |
| Rate limit hit | Queue requests. Max 3 concurrent per API. Exponential backoff on 429. |
| Network offline | Show "Offline" indicator in sidebar. Use cached data. Retry when online. |

---

## 6. File Changes Summary

| File | Action | Description |
|---|---|---|
| `electron/modules/stock-engine.ts` | **Rewrite** | Yahoo Finance India API, NSE/BSE symbols, sector indices |
| `electron/modules/weather-service.ts` | **Rewrite** | OpenWeatherMap + WAQI for Chennai, 5-day forecast, AQI |
| `electron/modules/event-bus.ts` | **Edit** | Add stock/weather event types |
| `electron/main.ts` | **Edit** | Wire up stock + weather IPC handlers |
| `src/pages/Dashboard.tsx` | **Rewrite** | Live Nifty/Sensex cards, stock watchlist, weather widget |
| `src/pages/Stocks.tsx` | **Rewrite** | Indian indices, sector breakdown, TradingView chart |
| `src/pages/Weather.tsx` | **New** | Full weather dashboard page |
| `src/components/WeatherWidget.tsx` | **New** | Compact weather card for Dashboard |
| `src/components/StockCard.tsx` | **New** | Stock watchlist card component |
| `src/components/IndexCard.tsx` | **New** | Index summary card with sparkline |
| `src/App.tsx` | **Edit** | Add Weather route + nav item |
| `src/lib/store.ts` | **Edit** | Add stocks + weather state |

---

## 7. API Keys Required

| Service | Key | Where to Get | Free Tier |
|---|---|---|---|
| OpenWeatherMap | `OPENWEATHER_API_KEY` | https://openweathermap.org/api | 1000 req/day |
| WAQI | `WAQI_TOKEN` | https://aqicn.org/data-platform/token/ | 1000 req/day |

Both keys should be stored in `electron/.env` (not committed to git) and loaded via `process.env` in the main process.

---

## 8. Testing

- **Manual:** Launch app, verify Dashboard shows live Nifty/Sensex data and Chennai weather
- **Stock Engine:** Verify quotes fetch for all 10 watchlist stocks + 10 indices
- **Weather:** Verify current conditions, 5-day forecast, and AQI all load
- **Error states:** Disconnect network, verify graceful degradation
- **Market hours:** Check refresh interval changes between market open/closed
