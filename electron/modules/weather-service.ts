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
  condition: string;
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
        condition: current.weather[0]?.description || 'Unknown',
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
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
  }
}

export default WeatherService;
