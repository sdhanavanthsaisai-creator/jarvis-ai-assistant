// src/pages/Weather.tsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Droplets, Wind, Eye, Sun, Thermometer, RefreshCw } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { fetchChennaiWeather } from '../lib/api';

// ══════════════════════════════════════════════════════
// CHENNAI WEATHER DASHBOARD
// ══════════════════════════════════════════════════════

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDayLength(sunrise: string, sunset: string): string {
  const diff = new Date(sunset).getTime() - new Date(sunrise).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function Weather() {
  const { weather, weatherLoading, weatherError } = useJarvisStore();

  useEffect(() => {
    fetchChennaiWeather();
  }, []);

  if (weatherLoading && !weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-jarvis-cyan/40 animate-spin mx-auto mb-4 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-jarvis-cyan/20" />
          </div>
          <p className="font-hud text-xs tracking-[0.2em] text-jarvis-cyan/60 uppercase">Loading Weather</p>
        </div>
      </div>
    );
  }

  if (weatherError && !weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Cloud size={40} className="text-jarvis-text-dim/30 mx-auto mb-4" />
          <p className="text-sm text-jarvis-text-dim">Weather data unavailable</p>
          <button onClick={fetchChennaiWeather} className="btn-hud text-xs mt-4">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cloud size={20} className="text-jarvis-cyan" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">Weather — Chennai</h1>
        </div>
        <button onClick={fetchChennaiWeather} className="btn-hud text-xs">
          <RefreshCw size={14} /> Refresh
        </button>
      </motion.div>

      {/* ── Hero Section ── */}
      <motion.div variants={item} className="glass-card neon-border p-6 text-center">
        <p className="text-5xl mb-2">{weather.conditionEmoji}</p>
        <p className="font-mono text-5xl text-jarvis-cyan glow-text-cyan">{weather.temp}°C</p>
        <p className="text-lg text-jarvis-text mt-2 capitalize">{weather.condition}</p>
        <p className="text-sm text-jarvis-text-dim mt-1">Feels like {weather.feelsLike}°C</p>
        <p className="font-mono text-xs text-jarvis-text-dim mt-2">H: {Math.max(...weather.dailyForecast.map(d => d.high))}° / L: {Math.min(...weather.dailyForecast.map(d => d.low))}°</p>
      </motion.div>

      {/* ── Detail Cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card neon-border p-4 text-center">
          <Droplets size={20} className="text-jarvis-cyan/50 mx-auto mb-2" />
          <p className="font-mono text-2xl text-jarvis-text">{weather.humidity}%</p>
          <p className="text-xs text-jarvis-text-dim mt-1">Humidity</p>
        </div>
        <div className="glass-card neon-border p-4 text-center">
          <Wind size={20} className="text-jarvis-cyan/50 mx-auto mb-2" />
          <p className="font-mono text-2xl text-jarvis-text">{weather.windSpeed}</p>
          <p className="text-xs text-jarvis-text-dim mt-1">km/h {weather.windDirection}</p>
        </div>
        <div className="glass-card neon-border p-4 text-center">
          <Sun size={20} className="text-jarvis-gold/50 mx-auto mb-2" />
          <p className="font-mono text-2xl text-jarvis-text">{weather.uvIndex}</p>
          <p className="text-xs text-jarvis-text-dim mt-1">UV — {weather.uvLevel}</p>
        </div>
        <div className="glass-card neon-border p-4 text-center">
          <Eye size={20} className="text-jarvis-cyan/50 mx-auto mb-2" />
          <p className="font-mono text-2xl text-jarvis-text">{weather.visibility}</p>
          <p className="text-xs text-jarvis-text-dim mt-1">km visibility</p>
        </div>
      </motion.div>

      {/* ── AQI Section ── */}
      {weather.aqi > 0 && (
        <motion.div variants={item} className="glass-card neon-border p-5">
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-4">Air Quality Index</h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-mono text-4xl" style={{ color: weather.aqiColor }}>{weather.aqi}</p>
              <p className="text-sm mt-1" style={{ color: weather.aqiColor }}>{weather.aqiLevel}</p>
            </div>
            <div className="flex-1">
              {/* AQI Gauge */}
              <div className="relative h-3 rounded-full overflow-hidden mb-2"
                   style={{ background: 'linear-gradient(90deg, #00e676 0%, #ffeb3b 20%, #ff9800 40%, #f44336 60%, #880e4f 100%)' }}>
                <div className="absolute top-0 h-full w-1 bg-white rounded shadow-lg transition-all"
                     style={{ left: `${Math.min(100, (weather.aqi / 500) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[0.55rem] font-mono text-jarvis-text-dim">
                <span>0</span><span>50</span><span>100</span><span>200</span><span>300</span><span>500</span>
              </div>
              <p className="text-xs text-jarvis-text-dim mt-3">{weather.aqiAdvice}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Hourly Forecast ── */}
      {weather.hourlyForecast.length > 0 && (
        <motion.div variants={item} className="glass-card neon-border p-5">
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-4">Hourly Forecast</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {weather.hourlyForecast.map((hour, i) => (
              <div key={i} className="flex-shrink-0 text-center px-3 py-2 rounded-lg border border-jarvis-border min-w-[70px]">
                <p className="text-[0.6rem] text-jarvis-text-dim">{new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</p>
                <p className="text-lg my-1">{getConditionEmoji(hour.icon)}</p>
                <p className="font-mono text-sm text-jarvis-text">{hour.temp}°</p>
                <p className="font-mono text-[0.55rem] text-jarvis-cyan/60">{hour.rainChance}%</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 5-Day Forecast ── */}
      {weather.dailyForecast.length > 0 && (
        <motion.div variants={item} className="glass-card neon-border p-5">
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-4">5-Day Forecast</h2>
          <div className="grid grid-cols-5 gap-3">
            {weather.dailyForecast.map((day, i) => (
              <div key={i} className="text-center p-3 rounded-lg border border-jarvis-border">
                <p className="font-mono text-xs text-jarvis-text-dim uppercase">{day.date}</p>
                <p className="text-2xl my-2">{getConditionEmoji(day.icon)}</p>
                <p className="font-mono text-sm text-jarvis-text">{day.high}°/{day.low}°</p>
                <p className="font-mono text-[0.55rem] text-jarvis-cyan/60 mt-1">{day.rainChance}% rain</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Sunrise / Sunset ── */}
      <motion.div variants={item} className="glass-card neon-border p-5">
        <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-4">Sunrise & Sunset</h2>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-2xl">☀️</p>
            <p className="font-mono text-sm text-jarvis-text mt-1">{formatTime(weather.sunrise)}</p>
            <p className="text-[0.6rem] text-jarvis-text-dim">Sunrise</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xs text-jarvis-text-dim">Day length</p>
            <p className="font-mono text-lg text-jarvis-cyan">{getDayLength(weather.sunrise, weather.sunset)}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">🌙</p>
            <p className="font-mono text-sm text-jarvis-text mt-1">{formatTime(weather.sunset)}</p>
            <p className="text-[0.6rem] text-jarvis-text-dim">Sunset</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
