import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User, Bot, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useJarvisStore, ChatMessage } from '../lib/store';
import VoiceButton from '../components/VoiceButton';
import { useVoice } from '../lib/useVoice';
import { getSmartResponse } from '../lib/smartRouter';

// ══════════════════════════════════════════════════════
// CHAT PAGE — FULL-SCREEN CONVERSATION WITH VOICE
// ══════════════════════════════════════════════════════

export default function Chat() {
  const { messages, addMessage, updateLastAssistantMessage, isProcessing, setProcessing, isSpeaking } = useJarvisStore();
  const [input, setInput] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, stopSpeaking, ttsSupported } = useVoice();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-speak assistant responses
  useEffect(() => {
    if (!autoSpeak || !ttsSupported || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && !last.isStreaming && last.content) {
      speak(last.content);
    }
  }, [messages, autoSpeak, speak, ttsSupported]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');
    setProcessing(true);

    // Stop any ongoing speech
    stopSpeaking();

    // Add placeholder for assistant
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMsg);

    // Try streaming via Electron
    if (window.electronAPI) {
      window.electronAPI.ai.stream(
        text,
        (chunk: string) => {
          updateLastAssistantMessage(
            useJarvisStore.getState().messages.slice(-1)[0]?.content + chunk || chunk
          );
        },
        () => {
          setProcessing(false);
        }
      );
    } else {
      // Smart response (no Ollama needed)
      setTimeout(() => {
        const response = getSmartResponse(text);
        updateLastAssistantMessage(response);
        setProcessing(false);
      }, 300);
    }
  }, [isProcessing, addMessage, updateLastAssistantMessage, setProcessing, stopSpeaking, speak]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    sendMessage(transcript);
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-jarvis-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-jarvis-cyan shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
          <h1 className="font-hud text-sm tracking-[0.2em] text-jarvis-cyan uppercase">JARVIS Online</h1>
        </div>
        <div className="flex items-center gap-3">
          {ttsSupported && (
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors hover:bg-white/5"
              title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
            >
              {autoSpeak ? (
                <Volume2 size={14} className="text-jarvis-gold" />
              ) : (
                <VolumeX size={14} className="text-jarvis-text-dim" />
              )}
              <span className={`${autoSpeak ? 'text-jarvis-gold' : 'text-jarvis-text-dim'}`}>
                VOICE {autoSpeak ? 'ON' : 'OFF'}
              </span>
            </button>
          )}
          <span className="font-mono text-xs text-jarvis-text-dim">MODEL: LLAMA 3.2</span>
          <Sparkles size={14} className="text-jarvis-gold animate-glow-breathe" />
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-2 border-jarvis-cyan/20 mx-auto mb-6 flex items-center justify-center">
                <Bot size={32} className="text-jarvis-cyan/40" />
              </div>
              <h2 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan/60 uppercase mb-2">J.A.R.V.I.S</h2>
              <p className="text-jarvis-text-dim text-sm">How may I assist you today, sir?</p>
              <p className="text-jarvis-text-dim/40 text-xs mt-2">Click the mic or type a command</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-jarvis-cyan/10 border border-jarvis-cyan/30 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-jarvis-cyan" />
                </div>
              )}

              <div
                className={`max-w-[70%] px-4 py-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-jarvis-cyan/10 border border-jarvis-cyan/20'
                    : 'glass-card border border-jarvis-border'
                }`}
              >
                <p className="text-sm text-jarvis-text leading-relaxed whitespace-pre-wrap">
                  {msg.content || (msg.isStreaming ? (
                    <span className="inline-flex items-center gap-1 text-jarvis-text-dim">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </span>
                  ) : '')}
                </p>
                <p className="text-[0.6rem] text-jarvis-text-dim/40 mt-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-jarvis-gold/10 border border-jarvis-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={16} className="text-jarvis-gold" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="px-6 py-4 border-t border-jarvis-border">
        <div className="flex items-center gap-3">
          <VoiceButton size="sm" onTranscript={handleVoiceTranscript} />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak or type a command, sir..."
              className="w-full bg-jarvis-bg-elevated border border-jarvis-border rounded-xl px-4 py-3 text-sm text-jarvis-text placeholder:text-jarvis-text-dim/50 focus:outline-none focus:border-jarvis-cyan/40 focus:shadow-[0_0_15px_rgba(0,212,255,0.1)] transition-all font-mono"
              disabled={isProcessing}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isProcessing}
            className="btn-hud disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
