import { useEffect, useRef } from 'react';
import { useJarvisStore } from '../lib/store';

// ══════════════════════════════════════════════════════
// STARTUP BRIEFING — JARVIS greets you on launch
// Uses raw SpeechSynthesis API (no hooks to avoid React conflicts)
// ══════════════════════════════════════════════════════

function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 1.05;
  u.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('hi'));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export default function StartupBriefing() {
  const hasSpoken = useRef(false);

  useEffect(() => {
    // Wait for voices to load
    if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => tryBriefing();
    }

    const tryBriefing = () => {
      if (hasSpoken.current) return;

      const { weather, indianIndices, stockMarketStatus } = useJarvisStore.getState();
      if (!weather) return;

      hasSpoken.current = true;

      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour >= 5 && hour < 12) greeting = 'Good morning';
      else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';

      let text = `${greeting}, sir. I am JARVIS. `;
      text += `In Chennai it is ${weather.temp} degrees and ${weather.condition}. Feels like ${weather.feelsLike} degrees. Humidity ${weather.humidity} percent, wind ${weather.windSpeed} kilometers per hour. `;

      if (weather.aqi > 0) {
        text += `Air quality index is ${weather.aqi}, rated ${weather.aqiLevel}. `;
      }

      if (indianIndices.length > 0) {
        const nifty = indianIndices.find(i => i.symbol === '^NSEI');
        const sensex = indianIndices.find(i => i.symbol === '^BSESN');
        text += `Markets are ${stockMarketStatus}. `;
        if (nifty) text += `Nifty ${nifty.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(nifty.changePercent).toFixed(2)} percent at ${nifty.price.toLocaleString('en-IN')}. `;
        if (sensex) text += `Sensex ${sensex.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(sensex.changePercent).toFixed(2)} percent at ${sensex.price.toLocaleString('en-IN')}. `;
      }

      text += `How may I assist you today?`;
      speakText(text);
    };

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      tryBriefing();
      if (hasSpoken.current || attempts >= 8) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
