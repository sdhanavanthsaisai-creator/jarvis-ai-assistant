// src/components/WeatherWidget.tsx
import React from 'react';
import { Cloud, Droplets, Wind, ArrowRight } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { getConditionEmoji } from '../lib/utils';

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
