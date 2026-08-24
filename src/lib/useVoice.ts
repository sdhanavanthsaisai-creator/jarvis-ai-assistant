import { useCallback, useRef, useEffect } from 'react';
import { useJarvisStore } from './store';

// ══════════════════════════════════════════════════════
// VOICE HOOK — Web Speech API (STT + TTS)
// ══════════════════════════════════════════════════════

// Check browser support
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const speechSupported = !!SpeechRecognition;
const ttsSupported = 'speechSynthesis' in window;

interface UseVoiceOptions {
  onTranscript?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { onTranscript, lang = 'en-IN', continuous = false } = options;
  const { setListening, setSpeaking, isListening } = useJarvisStore();
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    ttsSupported ? window.speechSynthesis : null
  );
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, []);

  // ── Start listening ──
  const startListening = useCallback(() => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    // Stop any ongoing TTS
    synthRef.current?.cancel();
    setSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript && onTranscriptRef.current) {
        onTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, continuous, setListening, setSpeaking]);

  // ── Stop listening ──
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, [setListening]);

  // ── Toggle listening ──
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Speak text (TTS) ──
  const speak = useCallback(
    (text: string, options?: { rate?: number; pitch?: number; voice?: string }) => {
      if (!ttsSupported || !synthRef.current) {
        console.warn('Speech synthesis not supported');
        return;
      }

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;

      // Pick a voice (prefer Google English or default)
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && v.name.includes('Google')
      );
      const english = voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      else if (english) utterance.voice = english;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synthRef.current.speak(utterance);
    },
    [lang, setSpeaking]
  );

  // ── Stop speaking ──
  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, [setSpeaking]);

  return {
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    speechSupported,
    ttsSupported,
  };
}
