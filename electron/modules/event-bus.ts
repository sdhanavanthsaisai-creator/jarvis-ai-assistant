import { EventEmitter } from 'events';

/**
 * JARVIS Event Bus
 * ─────────────────
 * Central nervous system of the application.
 * All modules communicate through this bus using named events.
 *
 * Events:
 *   voice_command    → Fired when voice input is received
 *   text_command     → Fired when text input is received
 *   instant_command  → Fired for commands handled without AI
 *   ai_query         → Fired when AI processing is needed
 *   ai_response      → Fired when AI completes a response
 *   ai_stream_chunk  → Fired for each streaming chunk from AI
 *   ai_stream_done   → Fired when streaming is complete
 *   speak            → Fired to trigger TTS output
 *   notification     → Fired to show a system notification
 *   weather_update   → Fired when weather data arrives
 *   stock_update     → Fired when stock data arrives
 *   news_update      → Fired when news feed is updated
 *   habit_update     → Fired when habit data changes
 *   file_changed     → Fired when a watched file changes
 */

class JarvisEventBus extends EventEmitter {
  private static instance: JarvisEventBus;
  private eventLog: Array<{ event: string; timestamp: number; data?: any }> = [];
  private maxLogSize = 100;

  constructor() {
    super();
    this.setMaxListeners(50); // JARVIS has many modules
  }

  static getInstance(): JarvisEventBus {
    if (!JarvisEventBus.instance) {
      JarvisEventBus.instance = new JarvisEventBus();
    }
    return JarvisEventBus.instance;
  }

  /**
   * Override emit to add logging for debugging
   */
  override emit(event: string | symbol, ...args: any[]): boolean {
    this.eventLog.push({
      event: String(event),
      timestamp: Date.now(),
      data: args[0],
    });

    // Trim log
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EVENT BUS] ${String(event)}`, args.length ? args[0] : '');
    }

    return super.emit(event, ...args);
  }

  /**
   * Get recent event log for debugging
   */
  getRecentEvents(count: number = 20): typeof this.eventLog {
    return this.eventLog.slice(-count);
  }

  /**
   * Listen for an event once and return a promise
   */
  waitForEvent(event: string, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      this.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}

// Export singleton
const eventBus = JarvisEventBus.getInstance();
export default eventBus;
