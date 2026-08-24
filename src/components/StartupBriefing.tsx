import { useEffect, useRef } from 'react';
import { useJarvisStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';

// ══════════════════════════════════════════════════════
// STARTUP BRIEFING — JARVIS greets you on launch
// ══════════════════════════════════════════════════════

export default function StartupBriefing() {
  const hasSpoken = useRef(false);
  const { speak, ttsSupported } = useVoice();

  useEffect(() => {
    if (hasSpoken || !ttsSupported) return;

    // Wait for data to load, then speak
    const tryBriefing = () => {
      if (hasSpoken.current) return;

      const { weather, indianIndices, stockMarketStatus } = useJarvisStore.getState();

      // Need at least weather data to give a briefing
      if (!weather) return;

      hasSpoken.current = true;

      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour >= 5 && hour < 12) greeting = 'Good morning';
      else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';

      let briefing = `${greeting}, sir. I am JARVIS, your personal assistant. `;

      // Weather
      briefing += `In Chennai, it is currently ${weather.temp} degrees and ${weather.condition}. Feels like ${weather.feelsLike} degrees. Humidity is ${weather.humidity} percent, wind ${weather.windSpeed} kilometers per hour. `;

      // AQI
      if (weather.aqi > 0) {
        briefing += `The air quality index is ${weather.aqi}, rated ${weather.aqiLevel}. `;
      }

      // Stocks
      if (indianIndices.length > 0) {
        const nifty = indianIndices.find(i => i.symbol === '^NSEI');
        const sensex = indianIndices.find(i => i.symbol === '^BSESN');
        briefing += `Markets are currently ${stockMarketStatus}. `;
        if (nifty) {
          briefing += `Nifty is at ${nifty.price.toLocaleString('en-IN')}, ${nifty.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(nifty.changePercent).toFixed(2)} percent. `;
        }
        if (sensex) {
          briefing += `Sensex at ${sensex.price.toLocaleString('en-IN')}, ${sensex.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(sensex.changePercent).toFixed(2)} percent. `;
        }
      }

      briefing += `How may I assist you today?`;

      speak(briefing, { rate: 1.05, pitch: 0.95 });
    };

    // Poll every 2 seconds until data is ready (max 15 seconds)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      tryBriefing();
      if (hasSpoken.current || attempts >= 8) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [speak, ttsSupported]);

  return null; // No UI — this is a voice-only component
}
