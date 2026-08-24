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
    setStockMarketStatus(status as 'open' | 'closed' | 'pre-market' | 'post-market');
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    setWeatherError(message);
  } finally {
    setWeatherLoading(false);
  }
}


