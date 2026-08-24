"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const CHENNAI_CONFIG = {
  city: "Chennai",
  country: "IN",
  lat: 13.0827,
  lon: 80.2707,
  timezone: "Asia/Kolkata"
};
function getConditionEmoji(iconCode) {
  const emojiMap = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "🌤️",
    "02n": "☁️",
    "03d": "⛅",
    "03n": "⛅",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "❄️",
    "13n": "❄️",
    "50d": "🌫️",
    "50n": "🌫️"
  };
  return emojiMap[iconCode] || "🌡️";
}
function getAQILevel(aqi) {
  if (aqi <= 50) return { level: "Good", color: "#00e676", advice: "Air quality is satisfactory. Enjoy outdoor activities." };
  if (aqi <= 100) return { level: "Moderate", color: "#ffeb3b", advice: "Acceptable quality. Unusually sensitive people should limit prolonged outdoor exertion." };
  if (aqi <= 200) return { level: "Poor", color: "#ff9800", advice: "Unhealthy for sensitive groups. Limit prolonged outdoor exertion." };
  if (aqi <= 300) return { level: "Very Poor", color: "#f44336", advice: "Health alert. Everyone may experience serious health effects. Avoid outdoor activities." };
  return { level: "Hazardous", color: "#880e4f", advice: "Emergency conditions. The entire population is affected. Stay indoors." };
}
function getUVLevel(uv) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}
function windDegToDirection(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
class WeatherService {
  constructor(eventBus) {
    __publicField(this, "eventBus");
    __publicField(this, "apiKey", "");
    __publicField(this, "waqiToken", "");
    __publicField(this, "refreshTimer", null);
    __publicField(this, "cachedData", null);
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("weather:refresh", () => this.fetchCurrentWeather());
  }
  setApiKey(key) {
    this.apiKey = key;
  }
  setWAQIToken(token) {
    this.waqiToken = token;
  }
  async fetchCurrentWeather() {
    var _a, _b, _c, _d, _e, _f;
    if (!this.apiKey) {
      console.warn("[Weather] No API key configured");
      return null;
    }
    try {
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CHENNAI_CONFIG.city},${CHENNAI_CONFIG.country}&units=metric&appid=${this.apiKey}`;
      const currentRes = await fetch(currentUrl);
      if (!currentRes.ok) throw new Error(`OWM error: ${currentRes.status}`);
      const current = await currentRes.json();
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${CHENNAI_CONFIG.city},${CHENNAI_CONFIG.country}&units=metric&appid=${this.apiKey}`;
      const forecastRes = await fetch(forecastUrl);
      const forecast = forecastRes.ok ? await forecastRes.json() : null;
      const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${CHENNAI_CONFIG.lat}&lon=${CHENNAI_CONFIG.lon}&appid=${this.apiKey}`;
      const uvRes = await fetch(uvUrl);
      const uvData = uvRes.ok ? await uvRes.json() : { value: 0 };
      const aqiData = await this.fetchAQI();
      const hourlyForecast = [];
      if (forecast == null ? void 0 : forecast.list) {
        for (let i = 0; i < Math.min(12, forecast.list.length); i++) {
          const item = forecast.list[i];
          hourlyForecast.push({
            time: item.dt_txt,
            temp: Math.round(item.main.temp),
            condition: ((_a = item.weather[0]) == null ? void 0 : _a.description) || "",
            icon: ((_b = item.weather[0]) == null ? void 0 : _b.icon) || "01d",
            rainChance: Math.round((item.pop || 0) * 100)
          });
        }
      }
      const dailyMap = /* @__PURE__ */ new Map();
      if (forecast == null ? void 0 : forecast.list) {
        for (const item of forecast.list) {
          const date = item.dt_txt.split(" ")[0];
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { high: item.main.temp_max, low: item.main.temp_min, condition: (_c = item.weather[0]) == null ? void 0 : _c.description, icon: (_d = item.weather[0]) == null ? void 0 : _d.icon, rainChance: Math.round((item.pop || 0) * 100) });
          } else {
            const existing = dailyMap.get(date);
            existing.high = Math.max(existing.high, item.main.temp_max);
            existing.low = Math.min(existing.low, item.main.temp_min);
          }
        }
      }
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dailyForecast = Array.from(dailyMap.entries()).slice(0, 5).map(([dateStr, data]) => {
        const d = new Date(dateStr);
        return {
          date: dayNames[d.getDay()],
          high: Math.round(data.high),
          low: Math.round(data.low),
          condition: data.condition,
          icon: data.icon,
          rainChance: data.rainChance
        };
      });
      const aqiLevel = getAQILevel(aqiData.aqi);
      const weatherData = {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed * 3.6),
        // m/s to km/h
        windDirection: windDegToDirection(current.wind.deg || 0),
        visibility: Math.round((current.visibility || 1e4) / 1e3),
        condition: ((_e = current.weather[0]) == null ? void 0 : _e.description) || "Unknown",
        conditionEmoji: getConditionEmoji(((_f = current.weather[0]) == null ? void 0 : _f.icon) || "01d"),
        uvIndex: Math.round(uvData.value || 0),
        uvLevel: getUVLevel(uvData.value || 0),
        aqi: aqiData.aqi,
        aqiLevel: aqiLevel.level,
        aqiColor: aqiLevel.color,
        aqiAdvice: aqiLevel.advice,
        sunrise: new Date(current.sys.sunrise * 1e3).toISOString(),
        sunset: new Date(current.sys.sunset * 1e3).toISOString(),
        hourlyForecast,
        dailyForecast,
        timestamp: Date.now()
      };
      this.cachedData = weatherData;
      this.eventBus.emit("weather:update", weatherData);
      return weatherData;
    } catch (error) {
      console.error("[Weather] Fetch failed:", error.message);
      this.eventBus.emit("weather:error", error.message);
      return this.cachedData;
    }
  }
  async fetchAQI() {
    var _a;
    if (!this.waqiToken) return { aqi: 0, level: "Unknown" };
    try {
      const url = `https://api.waqi.info/feed/chennai/?token=${this.waqiToken}`;
      const res = await fetch(url);
      if (!res.ok) return { aqi: 0, level: "Unknown" };
      const data = await res.json();
      return { aqi: ((_a = data.data) == null ? void 0 : _a.aqi) || 0, level: "" };
    } catch {
      return { aqi: 0, level: "Unknown" };
    }
  }
  startAutoRefresh() {
    this.fetchCurrentWeather();
    this.refreshTimer = setInterval(() => this.fetchCurrentWeather(), 30 * 60 * 1e3);
  }
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
exports.default = WeatherService;
