// src/lib/api.ts
import { useJarvisStore } from './store';
import type { StockQuote, WeatherData } from './types';

const YAHOO_BASE = '/api/yahoo/v8/finance/chart';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

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

const WATCHLIST = [
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

// ── Direct Yahoo Finance fetch (works in browser) ──

async function fetchYahooQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || price;
    const change = price - prevClose;
    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.symbol || symbol,
      price,
      change: Math.round(change * 100) / 100,
      changePercent: prevClose ? Math.round((change / prevClose) * 10000) / 100 : 0,
      dayHigh: meta.regularMarketDayHigh || price,
      dayLow: meta.regularMarketDayLow || price,
      week52High: meta.fiftyTwoWeekHigh || 0,
      week52Low: meta.fiftyTwoWeekLow || 0,
      volume: meta.regularMarketVolume || 0,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

async function fetchYahooBatch(symbols: string[]): Promise<StockQuote[]> {
  const batchSize = 3;
  const quotes: StockQuote[] = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fetchYahooQuote));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) quotes.push(r.value);
    }
  }
  return quotes;
}

// ── Public API ──

export async function fetchIndianIndices(): Promise<void> {
  const { setIndianIndices } = useJarvisStore.getState();

  if (window.electronAPI) {
    try {
      const indices = await window.electronAPI.stock.getIndices();
      setIndianIndices(indices);
      return;
    } catch { /* fall through to direct fetch */ }
  }

  const symbols = Object.values(INDEX_SYMBOLS);
  const quotes = await fetchYahooBatch(symbols);
  setIndianIndices(quotes);
}

export async function fetchSectorIndices(): Promise<void> {
  const { setSectorIndices } = useJarvisStore.getState();

  if (window.electronAPI) {
    try {
      const sectors = await window.electronAPI.stock.getSectors();
      setSectorIndices(sectors);
      return;
    } catch { /* fall through */ }
  }

  const symbols = Object.values(SECTOR_SYMBOLS);
  const quotes = await fetchYahooBatch(symbols);
  setSectorIndices(quotes);
}

export async function fetchStockWatchlist(): Promise<void> {
  const { setStockWatchlist, setStockMarketStatus } = useJarvisStore.getState();

  if (window.electronAPI) {
    try {
      const [watchlist, status] = await Promise.all([
        window.electronAPI.stock.getQuotes(WATCHLIST.map(w => w.symbol)),
        window.electronAPI.stock.getMarketStatus(),
      ]);
      setStockWatchlist(watchlist);
      setStockMarketStatus(status as any);
      return;
    } catch { /* fall through */ }
  }

  const symbols = WATCHLIST.map(w => w.symbol);
  const quotes = await fetchYahooBatch(symbols);
  setStockWatchlist(quotes);

  // Detect market status from IST
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  let status: 'open' | 'closed' | 'pre-market' | 'post-market' = 'closed';
  if (day >= 1 && day <= 5) {
    if (mins >= 555 && mins < 930) status = 'open';
    else if (mins >= 375 && mins < 555) status = 'pre-market';
    else if (mins >= 930 && mins < 1005) status = 'post-market';
  }
  setStockMarketStatus(status);
}

export async function fetchChennaiWeather(): Promise<void> {
  const { setWeather, setWeatherLoading, setWeatherError } = useJarvisStore.getState();

  if (window.electronAPI) {
    setWeatherLoading(true);
    try {
      const data = await window.electronAPI.weather.get();
      if (data) { setWeather(data); setWeatherLoading(false); return; }
    } catch { /* fall through */ }
  }

  // Direct OpenWeatherMap fetch — requires API key in env
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
  if (!apiKey) {
    setWeatherError('Set VITE_OPENWEATHER_API_KEY in .env');
    setWeatherLoading(false);
    return;
  }

  setWeatherLoading(true);
  try {
    const base = '/api/owm/data/2.5';
    const [currentRes, forecastRes, uvRes] = await Promise.all([
      fetch(`${base}/weather?q=Chennai,IN&units=metric&appid=${apiKey}`),
      fetch(`${base}/forecast?q=Chennai,IN&units=metric&appid=${apiKey}`),
      fetch(`${base}/uvi?lat=13.0827&lon=80.2707&appid=${apiKey}`),
    ]);

    if (!currentRes.ok) throw new Error(`OWM ${currentRes.status}`);
    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;
    const uvData = uvRes.ok ? await uvRes.json() : { value: 0 };

    const EMOJI: Record<string, string> = {
      '01d':'☀️','01n':'🌙','02d':'🌤️','02n':'☁️','03d':'⛅','03n':'⛅',
      '04d':'☁️','04n':'☁️','09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌧️',
      '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️','50d':'🌫️','50n':'🌫️',
    };
    const getEmoji = (c: string) => EMOJI[c] || '🌡️';
    const getUVLevel = (v: number) => v <= 2 ? 'Low' : v <= 5 ? 'Moderate' : v <= 7 ? 'High' : v <= 10 ? 'Very High' : 'Extreme';
    const getAQI = (v: number) => v <= 50 ? { level: 'Good', color: '#00e676', advice: 'Air quality is satisfactory.' }
      : v <= 100 ? { level: 'Moderate', color: '#ffeb3b', advice: 'Acceptable quality.' }
      : v <= 200 ? { level: 'Poor', color: '#ff9800', advice: 'Unhealthy for sensitive groups.' }
      : v <= 300 ? { level: 'Very Poor', color: '#f44336', advice: 'Health alert.' }
      : { level: 'Hazardous', color: '#880e4f', advice: 'Stay indoors.' };
    const windDir = (deg: number) => {
      const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
      return d[Math.round(deg / 22.5) % 16];
    };

    // Hourly (next 12)
    const hourly = (forecast?.list || []).slice(0, 12).map((h: any) => ({
      time: h.dt_txt, temp: Math.round(h.main.temp),
      condition: h.weather[0]?.description || '', icon: h.weather[0]?.icon || '01d',
      rainChance: Math.round((h.pop || 0) * 100),
    }));

    // Daily (next 5)
    const dailyMap = new Map<string, any>();
    for (const item of forecast?.list || []) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { high: item.main.temp_max, low: item.main.temp_min, condition: item.weather[0]?.description, icon: item.weather[0]?.icon, rainChance: Math.round((item.pop || 0) * 100) });
      } else {
        const e = dailyMap.get(date);
        e.high = Math.max(e.high, item.main.temp_max);
        e.low = Math.min(e.low, item.main.temp_min);
      }
    }
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daily = Array.from(dailyMap.entries()).slice(0, 5).map(([ds, d]) => ({
      date: dayNames[new Date(ds).getDay()], high: Math.round(d.high), low: Math.round(d.low),
      condition: d.condition, icon: d.icon, rainChance: d.rainChance,
    }));

    const aqiInfo = getAQI(0); // WAQI needs separate key, default to unknown

    const weatherData: WeatherData = {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      windSpeed: Math.round(current.wind.speed * 3.6),
      windDirection: windDir(current.wind.deg || 0),
      visibility: Math.round((current.visibility || 10000) / 1000),
      condition: current.weather[0]?.description || 'Unknown',
      conditionEmoji: getEmoji(current.weather[0]?.icon || '01d'),
      uvIndex: Math.round(uvData.value || 0),
      uvLevel: getUVLevel(uvData.value || 0),
      aqi: 0, aqiLevel: 'Add WAQI token', aqiColor: '#888', aqiAdvice: '',
      sunrise: new Date(current.sys.sunrise * 1000).toISOString(),
      sunset: new Date(current.sys.sunset * 1000).toISOString(),
      hourlyForecast: hourly,
      dailyForecast: daily,
      timestamp: Date.now(),
    };

    setWeather(weatherData);
  } catch (err: unknown) {
    setWeatherError(err instanceof Error ? err.message : String(err));
  } finally {
    setWeatherLoading(false);
  }
}
