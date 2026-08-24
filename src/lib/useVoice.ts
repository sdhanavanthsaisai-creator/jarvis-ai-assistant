import { useCallback, useRef, useEffect, useState } from 'react';
import { useJarvisStore } from './store';

// ══════════════════════════════════════════════════════
// VOICE HOOK — Web Speech API (STT + TTS)
// ══════════════════════════════════════════════════════

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const speechSupported = !!SpeechRecognition;
const ttsSupported = 'speechSynthesis' in window;

// Languages to try in order (en-US has widest Google API support)
const LANG_FALLBACKS = ['en-US', 'en-IN', 'en-GB', 'en'];

interface UseVoiceOptions {
  onTranscript?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { onTranscript, lang: requestedLang = 'en-US', continuous = false } = options;
  const { setListening, setSpeaking, isListening } = useJarvisStore();
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    ttsSupported ? window.speechSynthesis : null
  );
  const onTranscriptRef = useRef(onTranscript);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [langIndex, setLangIndex] = useState(0);
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
      setVoiceError('Speech recognition not supported in this browser');
      return;
    }

    // Stop any ongoing TTS
    synthRef.current?.cancel();
    setSpeaking(false);
    setVoiceError(null);

    // Try the best available language
    const langToUse = LANG_FALLBACKS[langIndex] || LANG_FALLBACKS[0];

    const recognition = new SpeechRecognition();
    recognition.lang = langToUse;
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript && onTranscriptRef.current) {
        onTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error, 'lang:', langToUse);
      setListening(false);

      if (event.error === 'network') {
        // Google speech API unreachable — show error immediately, no retry loop
        setVoiceError(
          'Voice requires Google servers (unavailable). Tap here to type instead.'
        );
      } else if (event.error === 'not-allowed') {
        setVoiceError('Microphone access denied. Please allow mic access in browser settings.');
      } else if (event.error === 'no-speech') {
        setVoiceError(null);
      } else {
        setVoiceError(`Voice error: ${event.error}. Tap here to type instead.`);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      setVoiceError('Failed to start voice recognition. Try refreshing the page.');
      setListening(false);
    }
  }, [langIndex, continuous, setListening, setSpeaking, langIndex]);

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
    (text: string, opts?: { rate?: number; pitch?: number }) => {
      if (!ttsSupported || !synthRef.current) {
        console.warn('Speech synthesis not supported');
        return;
      }

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = requestedLang;
      utterance.rate = opts?.rate ?? 1.0;
      utterance.pitch = opts?.pitch ?? 1.0;

      // Pick the best English voice available
      const voices = synthRef.current.getVoices();
      const preferred =
        voices.find((v) => v.lang === 'en-US' && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find((v) => v.lang === 'en-US') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synthRef.current.speak(utterance);
    },
    [requestedLang, setSpeaking]
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
    voiceError,
  };
}
