import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useJarvisStore } from '../lib/store';

// ══════════════════════════════════════════════════════
// VOICE BUTTON — Arc Reactor Mic Interface
// ══════════════════════════════════════════════════════

interface VoiceButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showWaveform?: boolean;
}

export default function VoiceButton({ size = 'md', showWaveform = true }: VoiceButtonProps) {
  const { isListening, isSpeaking, isProcessing, setListening } = useJarvisStore();
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const handleClick = useCallback(() => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);

    // Toggle listening state
    setListening(!isListening);

    // Emit to electron if available
    if (window.electronAPI) {
      // Voice toggle would be handled via IPC
    }
  }, [isListening, setListening]);

  return (
    <div className="relative flex items-center justify-center">
      {/* ── Waveform Bars (when listening) ── */}
      <AnimatePresence>
        {(isListening || isSpeaking) && showWaveform && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute flex items-center gap-0.5"
            style={{ width: size === 'sm' ? 50 : 80, height: size === 'sm' ? 24 : 32 }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: '4px',
                  animationDuration: `${0.3 + Math.random() * 0.4}s`,
                  background: isSpeaking ? '#ffd700' : '#00d4ff',
                  boxShadow: `0 0 4px ${isSpeaking ? 'rgba(255,215,0,0.4)' : 'rgba(0,212,255,0.4)'}`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Button ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`
          relative ${sizeClasses[size]} rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${isListening ? 'arc-reactor listening' : isProcessing ? 'arc-reactor processing' : 'arc-reactor'}
          ${isPressed ? 'scale-95' : ''}
        `}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        {/* ── Icon ── */}
        {isListening ? (
          <MicOff size={iconSizes[size]} className="text-jarvis-cyan relative z-10" />
        ) : (
          <Mic size={iconSizes[size]} className="text-jarvis-cyan/70 relative z-10" />
        )}

        {/* ── Pulse Rings ── */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.3, 0], scale: [1, 1.5, 2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border border-jarvis-cyan/30"
              />
              <motion.div
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.2, 0], scale: [1, 1.8, 2.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-0 rounded-full border border-jarvis-cyan/20"
              />
            </>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Status Label ── */}
      <AnimatePresence>
        {(isListening || isProcessing) && size !== 'sm' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-6 whitespace-nowrap"
          >
            <span className={`font-hud text-[0.55rem] tracking-[0.2em] uppercase ${
              isListening ? 'text-jarvis-cyan' : 'text-jarvis-gold'
            }`}>
              {isListening ? 'Listening...' : isProcessing ? 'Processing...' : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
