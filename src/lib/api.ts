// src/lib/api.ts
import { useJarvisStore } from './store';
import type { StockQuote, WeatherData } from './types';
import type { NewsArticle } from './store';

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

const WMO_CODES: Record<number, { desc: string; emoji: string }> = {
  0: { desc: 'Clear Sky', emoji: '☀️' }, 1: { desc: 'Mostly Clear', emoji: '🌤️' },
  2: { desc: 'Partly Cloudy', emoji: '⛅' }, 3: { desc: 'Overcast', emoji: '☁️' },
  45: { desc: 'Foggy', emoji: '🌫️' }, 48: { desc: 'Rime Fog', emoji: '🌫️' },
  51: { desc: 'Light Drizzle', emoji: '🌦️' }, 53: { desc: 'Drizzle', emoji: '🌦️' },
  55: { desc: 'Heavy Drizzle', emoji: '🌧️' }, 61: { desc: 'Light Rain', emoji: '🌦️' },
  63: { desc: 'Rain', emoji: '🌧️' }, 65: { desc: 'Heavy Rain', emoji: '🌧️' },
  71: { desc: 'Light Snow', emoji: '❄️' }, 73: { desc: 'Snow', emoji: '❄️' },
  75: { desc: 'Heavy Snow', emoji: '❄️' }, 77: { desc: 'Snow Grains', emoji: '❄️' },
  80: { desc: 'Light Showers', emoji: '🌦️' }, 81: { desc: 'Showers', emoji: '🌧️' },
  82: { desc: 'Heavy Showers', emoji: '🌧️' }, 85: { desc: 'Snow Showers', emoji: '❄️' },
  86: { desc: 'Heavy Snow Showers', emoji: '❄️' },
  95: { desc: 'Thunderstorm', emoji: '⛈️' }, 96: { desc: 'T-storm with Hail', emoji: '⛈️' },
  99: { desc: 'Heavy T-storm', emoji: '⛈️' },
};

const getUVLevel = (v: number) => v <= 2 ? 'Low' : v <= 5 ? 'Moderate' : v <= 7 ? 'High' : v <= 10 ? 'Very High' : 'Extreme';
const windDir = (deg: number) => {
  const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return d[Math.round(deg / 22.5) % 16];
};
const getAQI = (v: number) => v <= 20 ? { level: 'Good', color: '#00e676', advice: 'Air quality is satisfactory.' }
  : v <= 40 ? { level: 'Fair', color: '#8bc34a', advice: 'Acceptable quality.' }
  : v <= 60 ? { level: 'Moderate', color: '#ffeb3b', advice: 'Moderate quality.' }
  : v <= 80 ? { level: 'Poor', color: '#ff9800', advice: 'Unhealthy for sensitive groups.' }
  : v <= 100 ? { level: 'Very Poor', color: '#f44336', advice: 'Health alert.' }
  : { level: 'Hazardous', color: '#880e4f', advice: 'Stay indoors.' };

export async function fetchChennaiWeather(): Promise<void> {
  const { setWeather, setWeatherLoading, setWeatherError } = useJarvisStore.getState();

  if (window.electronAPI) {
    setWeatherLoading(true);
    try {
      const data = await window.electronAPI.weather.get();
      if (data) { setWeather(data); setWeatherLoading(false); return; }
    } catch { /* fall through */ }
  }

  setWeatherLoading(true);
  try {
    const LAT = 13.0827, LON = 80.2707;
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
        `&timezone=Asia/Kolkata&forecast_days=6`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=european_aqi`),
    ]);

    if (!weatherRes.ok) throw new Error(`Open-Meteo ${weatherRes.status}`);
    const w = await weatherRes.json();
    const aqiData = aqiRes.ok ? await aqiRes.json() : null;
    const euAqi = aqiData?.current?.european_aqi ?? 0;
    const aqi = getAQI(euAqi);

    const c = w.current;
    const code = c.weather_code ?? 0;
    const wmo = WMO_CODES[code] || { desc: 'Unknown', emoji: '🌡️' };

    const hourly = (w.hourly?.time || []).slice(0, 12).map((t: string, i: number) => ({
      time: t, temp: Math.round(w.hourly.temperature_2m[i]),
      condition: WMO_CODES[w.hourly.weather_code[i]]?.desc || '',
      icon: WMO_CODES[w.hourly.weather_code[i]]?.emoji || '🌡️',
      rainChance: Math.round(w.hourly.precipitation_probability[i] || 0),
    }));

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daily = (w.daily?.time || []).slice(0, 5).map((ds: string, i: number) => ({
      date: dayNames[new Date(ds + 'T00:00').getDay()],
      high: Math.round(w.daily.temperature_2m_max[i]),
      low: Math.round(w.daily.temperature_2m_min[i]),
      condition: WMO_CODES[w.daily.weather_code[i]]?.desc || '',
      icon: WMO_CODES[w.daily.weather_code[i]]?.emoji || '🌡️',
      rainChance: Math.round(w.daily.precipitation_probability_max[i] || 0),
    }));

    const weatherData: WeatherData = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDirection: windDir(c.wind_direction_10m || 0),
      visibility: Math.round((c.visibility || 10000) / 1000),
      condition: wmo.desc,
      conditionEmoji: wmo.emoji,
      uvIndex: Math.round(c.uv_index || 0),
      uvLevel: getUVLevel(c.uv_index || 0),
      aqi: euAqi, aqiLevel: aqi.level, aqiColor: aqi.color, aqiAdvice: aqi.advice,
      sunrise: w.daily?.sunrise?.[0] || '',
      sunset: w.daily?.sunset?.[0] || '',
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

// ══════════════════════════════════════════════════════
// NEWS — Live RSS Feed Fetcher
// ══════════════════════════════════════════════════════

interface RSSFeed { url: string; source: string; category: string; }

const RSS_FEEDS: RSSFeed[] = [
  { url: '/api/rss/techcrunch', source: 'TechCrunch', category: 'Tech' },
  { url: '/api/rss/bbc', source: 'BBC News', category: 'World' },
  { url: '/api/rss/hn', source: 'Hacker News', category: 'Tech' },
  { url: '/api/rss/india', source: 'Google News India', category: 'India' },
];

function parseRSSItems(xml: string, source: string, category: string): NewsArticle[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  const articles: NewsArticle[] = [];

  items.forEach((item) => {
    const title = item.querySelector('title')?.textContent?.trim() || '';
    const description = item.querySelector('description')?.textContent?.trim() || '';
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';

    // Strip HTML from description
    const tmp = document.createElement('div');
    tmp.innerHTML = description;
    const summary = tmp.textContent?.trim().slice(0, 200) || '';

    if (title) {
      articles.push({
        id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        summary,
        source,
        url: link,
        publishedAt: pubDate ? new Date(pubDate).getTime() : Date.now(),
        category,
      });
    }
  });

  return articles;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function fetchLiveNews(): Promise<void> {
  const { setNewsArticles, setNewsLoading } = useJarvisStore.getState();
  setNewsLoading(true);

  const allArticles: NewsArticle[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url);
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSItems(xml, feed.source, feed.category);
      } catch {
        return [];
      }
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') allArticles.push(...r.value);
  }

  // Sort by most recent first, keep top 30
  allArticles.sort((a, b) => b.publishedAt - a.publishedAt);
  setNewsArticles(allArticles.slice(0, 30));
  setNewsLoading(false);
}

export { timeAgo };

// ══════════════════════════════════════════════════════
// WEB SEARCH — DuckDuckGo + SearXNG Fallback (Browser)
// ══════════════════════════════════════════════════════

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// Search DuckDuckGo (works in browser via Vite proxy)
export async function searchWeb(query: string, numResults = 5): Promise<SearchResult[]> {
  try {
    const url = `/api/search/ddg/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!res.ok) throw new Error(`Search returned ${res.status}`);

    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const results: SearchResult[] = [];
    const resultElements = doc.querySelectorAll('.result');

    resultElements.forEach((el) => {
      const titleEl = el.querySelector('.result__title a');
      const snippetEl = el.querySelector('.result__snippet');
      const title = titleEl?.textContent?.trim() || '';
      let href = titleEl?.getAttribute('href') || '';
      const snippet = snippetEl?.textContent?.trim() || '';

      // Extract actual URL from DDG redirect
      if (href.includes('uddg=')) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) href = decodeURIComponent(match[1]);
      }

      if (title && href) {
        try {
          const hostname = new URL(href).hostname;
          results.push({ title, url: href, snippet, source: hostname });
        } catch {
          results.push({ title, url: href, snippet, source: 'unknown' });
        }
      }
    });

    return results.slice(0, numResults);
  } catch (err) {
    console.warn('[Search] DDG failed, trying SearXNG:', err);
    return searchSearXNG(query, numResults);
  }
}

// Search SearXNG (fallback)
async function searchSearXNG(query: string, numResults = 5): Promise<SearchResult[]> {
  try {
    const url = `/api/search/searxng/search?q=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SearXNG returned ${res.status}`);

    const data = await res.json() as any;
    return (data.results || []).slice(0, numResults).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.content || '',
      source: r.engine || 'searxng',
    }));
  } catch (err) {
    console.error('[Search] SearXNG also failed:', err);
    return [];
  }
}

// Fetch and extract page content
export async function fetchPageContent(url: string, maxLength = 3000): Promise<{ title: string; content: string }> {
  try {
    // In browser, we can't directly fetch arbitrary pages due to CORS
    // Use the proxy or return a message
    return {
      title: 'Page Content',
      content: `To fetch and read web pages, run JARVIS in Electron mode (npm run electron:dev) for full browser automation.`,
    };
  } catch {
    return { title: '', content: '' };
  }
}
