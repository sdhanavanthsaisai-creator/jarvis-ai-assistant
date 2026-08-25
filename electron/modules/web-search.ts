import { EventEmitter } from 'events';
import * as cheerio from 'cheerio';

// ══════════════════════════════════════════════════════
// WEB SEARCH — DuckDuckGo + SearXNG Fallback
// Free, no API keys needed
// ══════════════════════════════════════════════════════

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

class WebSearch {
  private eventBus: EventEmitter;
  private searxngUrl = 'https://search.inetol.net'; // Public SearXNG instance

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }

  // ── Search DuckDuckGo ──

  async searchDDG(query: string, numResults = 5): Promise<SearchResult[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) throw new Error(`DDG returned ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      $('.result').each((_, el) => {
        const title = $(el).find('.result__title a').text().trim();
        const href = $(el).find('.result__title a').attr('href') || '';
        const snippet = $(el).find('.result__snippet').text().trim();

        // Extract actual URL from DDG redirect
        let actualUrl = href;
        if (href.includes('uddg=')) {
          const match = href.match(/uddg=([^&]+)/);
          if (match) actualUrl = decodeURIComponent(match[1]);
        }

        if (title && actualUrl) {
          results.push({
            title,
            url: actualUrl,
            snippet,
            source: new URL(actualUrl).hostname,
          });
        }
      });

      return results.slice(0, numResults);
    } catch (err) {
      console.warn('[WebSearch] DDG failed, trying SearXNG fallback:', err);
      return this.searchSearXNG(query, numResults);
    }
  }

  // ── Search SearXNG (Fallback) ──

  async searchSearXNG(query: string, numResults = 5): Promise<SearchResult[]> {
    try {
      const url = `${this.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) throw new Error(`SearXNG returned ${response.status}`);

      const data = await response.json() as any;
      const results: SearchResult[] = (data.results || []).slice(0, numResults).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
        source: r.engine || new URL(r.url || 'https://unknown.com').hostname,
      }));

      return results;
    } catch (err) {
      console.error('[WebSearch] SearXNG fallback also failed:', err);
      return [];
    }
  }

  // ── Search (with automatic fallback) ──

  async searchWeb(query: string, numResults = 5): Promise<{ results: SearchResult[]; query: string }> {
    let results = await this.searchDDG(query, numResults);

    if (results.length === 0) {
      results = await this.searchSearXNG(query, numResults);
    }

    return { results, query };
  }

  // ── Fetch and Extract Page Content ──

  async fetchPage(url: string, maxLength = 5000): Promise<{ success: boolean; content: string; title: string; url: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, nav, footer
      $('script, style, nav, footer, header, aside, .ad, .ads, .sidebar').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim();

      // Extract main content
      let content = '';
      const mainSelectors = ['article', 'main', '.content', '.post', '.article', '#content', '.entry-content'];
      for (const sel of mainSelectors) {
        const el = $(sel).first();
        if (el.length) {
          content = el.text().replace(/\s+/g, ' ').trim();
          break;
        }
      }

      // Fallback to body
      if (!content) {
        content = $('body').text().replace(/\s+/g, ' ').trim();
      }

      // Truncate
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
      }

      return { success: true, content, title, url };
    } catch (err: any) {
      return {
        success: false,
        content: '',
        title: '',
        url,
      };
    }
  }

  // ── Search + Fetch + Combine ──

  async searchAndSummarize(query: string): Promise<{ query: string; results: SearchResult[]; content: string }> {
    const { results } = await this.searchWeb(query, 3);

    let combinedContent = '';
    for (const result of results.slice(0, 2)) {
      const page = await this.fetchPage(result.url, 2000);
      if (page.success && page.content) {
        combinedContent += `\n\n--- ${result.title} ---\n${result.snippet}\n${page.content.substring(0, 1000)}`;
      } else {
        combinedContent += `\n\n--- ${result.title} ---\n${result.snippet}`;
      }
    }

    return { query, results, content: combinedContent.trim() };
  }
}

export default WebSearch;
