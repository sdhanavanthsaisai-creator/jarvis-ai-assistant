import { EventEmitter } from 'events';

/**
 * JARVIS News Aggregator
 * ──────────────────────
 * Aggregates news from RSS feeds, filters with AI,
 * and categorizes articles by topic.
 */

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface FeedConfig {
  name: string;
  url: string;
  category: string;
}

const DEFAULT_FEEDS: FeedConfig[] = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech' },
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'Finance' },
  { name: 'BBC Science', url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Science' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'Tech' },
];

class NewsAggregator {
  private eventBus: EventEmitter;
  private feeds: FeedConfig[] = [...DEFAULT_FEEDS];
  private articles: NewsArticle[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('news:refresh', () => this.fetchAllFeeds());
  }

  /**
   * Fetch all configured feeds
   */
  async fetchAllFeeds(): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    // Use RSS parser if available, otherwise use basic fetch
    try {
      // Dynamic import for rss-parser (optional dependency)
      const RSSParser = (await import('rss-parser')).default;
      const parser = new RSSParser({
        timeout: 10000,
        headers: { 'User-Agent': 'JARVIS-News-Aggregator/1.0' },
      });

      for (const feed of this.feeds) {
        try {
          const result = await parser.parseURL(feed.url);
          for (const item of result.items.slice(0, 10)) {
            allArticles.push({
              id: `${feed.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title: item.title || 'Untitled',
              summary: item.contentSnippet || item.content || '',
              source: feed.name,
              url: item.link || '',
              publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
              category: feed.category,
              sentiment: 'neutral',
            });
          }
        } catch (err: any) {
          console.warn(`[News] Failed to fetch ${feed.name}:`, err.message);
        }
      }
    } catch {
      console.warn('[News] rss-parser not available, using placeholder data');
    }

    // Sort by date, most recent first
    allArticles.sort((a, b) => b.publishedAt - a.publishedAt);
    this.articles = allArticles.slice(0, 50); // Keep top 50

    this.eventBus.emit('news:update', this.articles);
    return this.articles;
  }

  /**
   * Get articles filtered by category
   */
  getByCategory(category: string): NewsArticle[] {
    if (category === 'All') return this.articles;
    return this.articles.filter((a) => a.category === category);
  }

  /**
   * Start auto-refresh (every 15 minutes)
   */
  startAutoRefresh(intervalMs: number = 15 * 60 * 1000): void {
    this.fetchAllFeeds();
    this.refreshInterval = setInterval(() => this.fetchAllFeeds(), intervalMs);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export default NewsAggregator;
