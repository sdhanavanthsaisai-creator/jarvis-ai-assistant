import { EventEmitter } from 'events';

/**
 * JARVIS Messaging Bridge
 * ───────────────────────
 * WhatsApp Web automation via Puppeteer for sending/receiving messages.
 * ⚠️ Experimental — requires WhatsApp Web session.
 */

class MessagingBridge {
  private eventBus: EventEmitter;
  private isInitialized: boolean = false;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('message:send', (data: { to: string; message: string }) => {
      this.sendMessage(data.to, data.message);
    });
  }

  /**
   * Initialize Puppeteer browser session
   */
  async initialize(): Promise<boolean> {
    try {
      // Dynamic import — puppeteer is optional
      const puppeteer = await import('puppeteer');
      console.log('[Messaging] Puppeteer available. WhatsApp Web integration is experimental.');
      console.log('[Messaging] To use: scan QR code on first launch via WhatsApp Web.');
      this.isInitialized = false; // Set to true after QR scan
      return false;
    } catch {
      console.warn('[Messaging] Puppeteer not available. WhatsApp integration disabled.');
      return false;
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('[Messaging] Not initialized. Please scan WhatsApp QR code first.');
      return false;
    }

    try {
      // WhatsApp Web automation would go here
      console.log(`[Messaging] Sending to ${to}: ${message}`);
      return true;
    } catch (err: any) {
      console.error('[Messaging] Send failed:', err.message);
      return false;
    }
  }

  /**
   * Get status
   */
  getStatus(): { isInitialized: boolean } {
    return { isInitialized: this.isInitialized };
  }
}

export default MessagingBridge;
