import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════
// BROWSER AUTOMATION — puppeteer-core + Local Chrome
// Uses user's installed Chrome, no Chromium download
// ══════════════════════════════════════════════════════

class BrowserAutomation {
  private eventBus: EventEmitter;
  private browser: any = null;
  private page: any = null;
  private isRunning = false;

  // Common Chrome paths on Windows
  private chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ];

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }

  // ── Find Chrome ──

  private async findChrome(): Promise<string | null> {
    const fs = require('fs');
    for (const chromePath of this.chromePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }
    return null;
  }

  // ── Open Browser ──

  async openBrowser(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: 'Browser is already running.' };
    }

    try {
      const puppeteer = await import('puppeteer-core');
      const chromePath = await this.findChrome();

      if (!chromePath) {
        return {
          success: false,
          message: 'Chrome not found. Please install Google Chrome or set the path in Settings.',
        };
      }

      this.browser = await puppeteer.default.launch({
        executablePath: chromePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      this.isRunning = true;

      return { success: true, message: 'Browser opened successfully.' };
    } catch (err: any) {
      return { success: false, message: `Failed to open browser: ${err.message}` };
    }
  }

  // ── Navigate ──

  async navigateTo(url: string): Promise<{ success: boolean; title: string; url: string; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, title: '', url, message: 'Browser not running. Open it first.' };
    }

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const title = await this.page.title();
      const currentUrl = this.page.url();

      return {
        success: true,
        title,
        url: currentUrl,
        message: `Opened: ${title}`,
      };
    } catch (err: any) {
      return { success: false, title: '', url, message: `Navigation failed: ${err.message}` };
    }
  }

  // ── Click Element ──

  async clickElement(selector: string): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, message: 'Browser not running.' };
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.click(selector);
      return { success: true, message: `Clicked: ${selector}` };
    } catch (err: any) {
      return { success: false, message: `Click failed: ${err.message}` };
    }
  }

  // ── Type Text ──

  async typeText(selector: string, text: string): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, message: 'Browser not running.' };
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.click(selector, { clickCount: 3 }); // Select all
      await this.page.type(selector, text);
      return { success: true, message: `Typed "${text}" into ${selector}` };
    } catch (err: any) {
      return { success: false, message: `Type failed: ${err.message}` };
    }
  }

  // ── Extract Text ──

  async extractText(selector: string): Promise<{ success: boolean; text: string; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, text: '', message: 'Browser not running.' };
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      const text = await this.page.$eval(selector, (el: any) => el.textContent?.trim() || '');
      return { success: true, text, message: `Extracted text from ${selector}` };
    } catch (err: any) {
      return { success: false, text: '', message: `Extract failed: ${err.message}` };
    }
  }

  // ── Take Screenshot ──

  async takeScreenshot(): Promise<{ success: boolean; screenshot: string; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, screenshot: '', message: 'Browser not running.' };
    }

    try {
      const screenshot = await this.page.screenshot({
        encoding: 'base64',
        type: 'png',
      });
      return { success: true, screenshot, message: 'Screenshot captured.' };
    } catch (err: any) {
      return { success: false, screenshot: '', message: `Screenshot failed: ${err.message}` };
    }
  }

  // ── Get Page Content ──

  async getPageContent(): Promise<{ success: boolean; content: string; title: string; message: string }> {
    if (!this.isRunning || !this.page) {
      return { success: false, content: '', title: '', message: 'Browser not running.' };
    }

    try {
      const title = await this.page.title();
      const content = await this.page.evaluate(() => {
        // Remove scripts, styles
        const els = document.querySelectorAll('script, style, nav, footer, header');
        els.forEach(el => el.remove());

        const mainSelectors = ['article', 'main', '.content', '#content'];
        for (const sel of mainSelectors) {
          const el = document.querySelector(sel);
          if (el) return el.textContent?.trim() || '';
        }
        return document.body?.textContent?.trim() || '';
      });

      return {
        success: true,
        content: content.substring(0, 5000),
        title,
        message: `Extracted content from: ${title}`,
      };
    } catch (err: any) {
      return { success: false, content: '', title: '', message: `Content extraction failed: ${err.message}` };
    }
  }

  // ── Close Browser ──

  async closeBrowser(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning || !this.browser) {
      return { success: false, message: 'Browser not running.' };
    }

    try {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isRunning = false;
      return { success: true, message: 'Browser closed.' };
    } catch (err: any) {
      return { success: false, message: `Close failed: ${err.message}` };
    }
  }

  // ── Status ──

  getStatus(): { isRunning: boolean; currentUrl: string } {
    return {
      isRunning: this.isRunning,
      currentUrl: this.page?.url() || '',
    };
  }
}

export default BrowserAutomation;
