import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';

// ══════════════════════════════════════════════════════
// FLOATING MIC — Arc Reactor, bottom-right, all pages
// ══════════════════════════════════════════════════════

export default function FloatingMic() {
  const navigate = useNavigate();
  const { isListening, isSpeaking, isProcessing, addMessage, setProcessing, updateLastAssistantMessage } = useJarvisStore();

  const handleTranscript = useCallback((text: string) => {
    // Navigate to chat and send the message
    navigate('/chat');

    // Small delay to let the page render, then send
    setTimeout(() => {
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setProcessing(true);

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      addMessage(assistantMsg);

      // Smart router fallback for browser dev
      setTimeout(() => {
        const lower = text.toLowerCase();
        let response = '';

        if (lower.includes('weather') || lower.includes('temperature')) {
          const w = useJarvisStore.getState().weather;
          if (w) {
            response = `In Chennai it's ${w.temp}°C and ${w.condition}, sir. Feels like ${w.feelsLike}°C. Humidity ${w.humidity}%, wind ${w.windSpeed} km/h ${w.windDirection}. AQI is ${w.aqi}, rated ${w.aqiLevel}.`;
          } else {
            response = "Weather data isn't loaded yet, sir.";
          }
        } else if (lower.includes('stock') || lower.includes('nifty') || lower.includes('sensex') || lower.includes('market')) {
          const indices = useJarvisStore.getState().indianIndices;
          if (indices.length > 0) {
            const nifty = indices.find(i => i.symbol === '^NSEI');
            const sensex = indices.find(i => i.symbol === '^BSESN');
            response = `Markets are ${useJarvisStore.getState().stockMarketStatus}. ${nifty ? `Nifty at ${nifty.price.toLocaleString('en-IN')}, ${nifty.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(nifty.changePercent).toFixed(2)}%` : ''}. ${sensex ? `Sensex at ${sensex.price.toLocaleString('en-IN')}, ${sensex.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(sensex.changePercent).toFixed(2)}%` : ''}.`;
          } else {
            response = "Market data isn't loaded yet, sir.";
          }
        } else if (lower.includes('hello') || lower.includes('hey')) {
          response = "Good to see you, sir. How may I assist you?";
        } else {
          response = `At your service, sir. I received: "${text}". Connect Ollama in Settings for full AI responses.`;
        }

        updateLastAssistantMessage(response);
        setProcessing(false);
      }, 500);
    }, 300);
  }, [navigate, addMessage, setProcessing, updateLastAssistantMessage]);

  const { toggleListening, speechSupported } = useVoice({ onTranscript: handleTranscript });

  if (!speechSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {/* ── Waveform when active ── */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-0.5 mb-1"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: '3px',
                  animationDuration: `${0.3 + Math.random() * 0.4}s`,
                  background: isSpeaking ? '#ffd700' : '#00d4ff',
                  boxShadow: `0 0 6px ${isSpeaking ? 'rgba(255,215,0,0.5)' : 'rgba(0,212,255,0.5)'}`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status label ── */}
      <AnimatePresence>
        {(isListening || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="glass-card border border-jarvis-border px-3 py-1 rounded-full"
          >
            <span className="font-hud text-[0.5rem] tracking-[0.2em] uppercase text-jarvis-cyan">
              {isListening ? '● Listening...' : '◎ Processing...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Arc Reactor Button ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={toggleListening}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${isListening ? 'arc-reactor listening' : 'arc-reactor'}
        `}
        aria-label={isListening ? 'Stop listening' : 'Start speaking to JARVIS'}
      >
        {/* Icon */}
        {isListening ? (
          <MicOff size={24} className="text-jarvis-cyan relative z-10" />
        ) : (
          <Mic size={24} className="text-jarvis-cyan/70 relative z-10" />
        )}

        {/* Pulse rings */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.4, 0], scale: [1, 1.4, 1.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-jarvis-cyan/40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.25, 0], scale: [1, 1.7, 2.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-0 rounded-full border border-jarvis-cyan/25"
              />
              <motion.div
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.15, 0], scale: [1, 2, 2.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                className="absolute inset-0 rounded-full border border-jarvis-cyan/15"
              />
            </>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
