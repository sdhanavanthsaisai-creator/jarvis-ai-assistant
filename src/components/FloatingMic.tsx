import { useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, MessageSquare } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { useVoice } from '../lib/useVoice';

// ══════════════════════════════════════════════════════
// FLOATING MIC — Arc Reactor, bottom-right, all pages
// ══════════════════════════════════════════════════════

export default function FloatingMic() {
  const navigate = useNavigate();
  const { isListening, isSpeaking, isProcessing, addMessage, setProcessing, updateLastAssistantMessage } = useJarvisStore();
  const [showInput, setShowInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sendToChat = useCallback((text: string) => {
    navigate('/chat');
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

      // Smart router
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

  const handleTranscript = useCallback((text: string) => {
    sendToChat(text);
  }, [sendToChat]);

  const { toggleListening, speechSupported, voiceError } = useVoice({ onTranscript: handleTranscript });

  // Focus input when shown
  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInput]);

  const handleMicClick = () => {
    if (voiceError) {
      // Speech failed — show text input instead
      setShowInput(true);
      return;
    }
    toggleListening();
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    sendToChat(textInput.trim());
    setTextInput('');
    setShowInput(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* ── Text Input Fallback ── */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="glass-card neon-border p-3 rounded-xl flex items-center gap-2"
            style={{ width: 320 }}
          >
            <MessageSquare size={14} className="text-jarvis-cyan flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') { setShowInput(false); setTextInput(''); }
              }}
              placeholder="Type your command, sir..."
              className="flex-1 bg-transparent text-sm text-jarvis-text placeholder:text-jarvis-text-dim/50 focus:outline-none font-mono"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="w-8 h-8 rounded-full bg-jarvis-cyan/20 flex items-center justify-center hover:bg-jarvis-cyan/30 transition-colors disabled:opacity-30"
            >
              <Send size={14} className="text-jarvis-cyan" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error tooltip ── */}
      <AnimatePresence>
        {voiceError && !showInput && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="glass-card border border-jarvis-gold/30 px-3 py-2 rounded-lg text-center cursor-pointer hover:border-jarvis-gold/50 transition-colors"
            style={{ maxWidth: 240 }}
            onClick={() => setShowInput(true)}
          >
            <span className="text-[0.55rem] text-jarvis-gold leading-tight block">{voiceError}</span>
            <span className="text-[0.5rem] text-jarvis-cyan/60 mt-1 block">Click here to type instead →</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Waveform when active ── */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-0.5"
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

      {/* ── Arc Reactor Button ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleMicClick}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${isListening ? 'arc-reactor listening' : 'arc-reactor'}
        `}
        aria-label={isListening ? 'Stop listening' : 'Start speaking to JARVIS'}
      >
        {isListening ? (
          <MicOff size={24} className="text-jarvis-cyan relative z-10" />
        ) : (
          <Mic size={24} className="text-jarvis-cyan/70 relative z-10" />
        )}

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
