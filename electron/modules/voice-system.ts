import { EventEmitter } from 'events';

/**
 * JARVIS Voice System
 * ───────────────────
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS).
 * Uses Web Speech API (Chromium native) for both operations.
 *
 * In Electron, the Web Speech API is available in the renderer process.
 * This module manages the IPC communication for voice events.
 */

interface VoiceConfig {
  language: string;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  wakeWord: string;
  continuous: boolean;
}

const DEFAULT_CONFIG: VoiceConfig = {
  language: 'en-US',
  ttsVoice: 'Daniel', // British male voice (JARVIS-like)
  ttsRate: 1.0,
  ttsPitch: 0.9,     // Slightly deeper for JARVIS feel
  ttsVolume: 1.0,
  wakeWord: 'jarvis',
  continuous: false,
};

class VoiceSystem {
  private eventBus: EventEmitter;
  private config: VoiceConfig;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private ttsQueue: string[] = [];

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // When the event bus says "speak", we queue TTS output
    this.eventBus.on('speak', (text: string) => {
      this.speak(text);
    });

    // Voice commands from renderer
    this.eventBus.on('voice_command', (command: string) => {
      this.processVoiceCommand(command);
    });
  }

  /**
   * Process a voice command through the smart router
   */
  private processVoiceCommand(command: string): void {
    const text = command.toLowerCase().trim();

    // Check if it starts with the wake word
    const hasWakeWord = text.startsWith(this.config.wakeWord);
    const cleanedText = hasWakeWord
      ? text.slice(this.config.wakeWord.length).trim()
      : text;

    // Emit the cleaned command for the event bus
    if (hasWakeWord) {
      this.eventBus.emit('text_command', cleanedText);
    } else {
      this.eventBus.emit('text_command', cleanedText);
    }
  }

  /**
   * Text-to-Speech — Queue and speak text
   */
  speak(text: string): void {
    this.ttsQueue.push(text);
    if (!this.isSpeaking) {
      this.processNextInQueue();
    }
  }

  private processNextInQueue(): void {
    if (this.ttsQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const text = this.ttsQueue.shift()!;

    // Notify renderer that JARVIS is speaking
    this.eventBus.emit('voice:speaking', true);

    // In the actual renderer, Web Speech API SpeechSynthesis is used.
    // Here we just track state and emit events.
    // The renderer handles the actual speech synthesis.

    // Simulate speech duration (will be replaced by actual Web Speech API in renderer)
    const estimatedDuration = Math.max(1000, text.split(' ').length * 300);

    setTimeout(() => {
      this.eventBus.emit('voice:speaking', false);
      this.processNextInQueue();
    }, estimatedDuration);
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    this.ttsQueue = [];
    this.isSpeaking = false;
    this.eventBus.emit('voice:speaking', false);
    this.eventBus.emit('voice:stop-speech');
  }

  /**
   * Start listening
   */
  startListening(): void {
    this.isListening = true;
    this.eventBus.emit('voice:listening', true);
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.isListening = false;
    this.eventBus.emit('voice:listening', false);
  }

  /**
   * Toggle listening state
   */
  toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
    return this.isListening;
  }

  /**
   * Update voice configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current status
   */
  getStatus(): { isListening: boolean; isSpeaking: boolean; config: VoiceConfig } {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      config: { ...this.config },
    };
  }
}

export default VoiceSystem;
