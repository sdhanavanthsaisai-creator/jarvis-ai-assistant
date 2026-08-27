/**
 * Server-side search plugin for Vite dev server.
 * Proxies search requests through Node.js to bypass CORS and bot detection.
 * Uses Bing HTML scraping + DuckDuckGo HTML + Wikipedia API.
 */
import type { Plugin } from 'vite';
import https from 'https';
import http from 'http';

function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers,
      },
      timeout: 10000,
    }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .trim();
}

/** Parse Bing search HTML */
function parseBing(html: string): Array<{ title: string; snippet: string; url: string }> {
  const results: Array<{ title: string; snippet: string; url: string }> = [];
  
  // Bing uses <li class="b_algo"> for each result
  const blocks = html.split(/<li class="b_algo"/gi);
  
  for (let i = 1; i < blocks.length && results.length < 8; i++) {
    const block = blocks[i].substring(0, 2000);
    
    // Extract URL from first <a href> (decode HTML entities first)
    const urlMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
    let url = urlMatch ? urlMatch[1].replace(/&amp;/g, '&') : '';
    // Decode Bing redirect URLs (bing.com/ck/a?...&u=encoded...)
    const uMatch = url.match(/[&?]u=([A-Za-z0-9+/=]+)/);
    if (uMatch) {
      try {
        const raw = uMatch[1].substring(2); // strip Bing's 2-char prefix
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        if (decoded.startsWith('http')) url = decoded;
      } catch { /* keep original */ }
    }
    
    // Extract title from <h2><a>...</a></h2>
    const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]) : '';
    
    // Extract snippet
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).substring(0, 200) : '';
    
    if (title && title.length > 5) {
      results.push({ title, snippet, url });
    }
  }
  
  return results;
}

/** Parse DuckDuckGo HTML search results */
function parseDDGHtml(html: string): Array<{ title: string; snippet: string; url: string }> {
  const results: Array<{ title: string; snippet: string; url: string }> = [];
  
  // DDG HTML uses result__body blocks
  const titlePattern = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = titlePattern.exec(html)) !== null && results.length < 8) {
    const url = match[1].replace(/.*uddg=/, '').replace(/&.*/, '') || match[1];
    const title = stripHtml(match[2]);
    
    // Find snippet after this match
    const afterMatch = html.substring(match.index + match[0].length, match.index + match[0].length + 1000);
    const snippetMatch = afterMatch.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)/i);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).substring(0, 200) : '';
    
    if (title && title.length > 5) {
      results.push({ title, snippet, url });
    }
  }
  
  return results;
}

/** Search Bing and return results as JSON */
async function searchBing(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const html = await fetchUrl(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`);
    return parseBing(html);
  } catch {
    return [];
  }
}

/** Search DuckDuckGo HTML and return results */
async function searchDDG(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    return parseDDGHtml(html);
  } catch {
    return [];
  }
}

/** Get Wikipedia summary for a topic */
async function searchWikipedia(query: string): Promise<string | null> {
  try {
    // First search for the article
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const data = await fetchUrl(searchUrl, { 'Accept': 'application/json' });
    const json = JSON.parse(data);
    if (json.extract && json.extract.length > 20) {
      let result = json.extract;
      if (json.content_urls?.desktop?.page) {
        result += `\n\nSource: ${json.content_urls.desktop.page}`;
      }
      return result;
    }
  } catch { /* continue */ }
  return null;
}

/** Format results into a readable response */
function formatResults(query: string, results: Array<{ title: string; snippet: string; url: string }>): string {
  if (results.length === 0) return '';
  
  const formatted = results
    .slice(0, 6)
    .map((r, i) => {
      let entry = `${i + 1}. ${r.title}`;
      if (r.snippet) entry += `\n   ${r.snippet}`;
      if (r.url) entry += `\n   ${r.url}`;
      return entry;
    })
    .join('\n\n');
  
  return `Here's what I found about "${query}", sir:\n\n${formatted}\n\n💡 Google it: https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function searchPlugin(): Plugin {
  return {
    name: 'jarvis-search-proxy',
    configureServer(server) {
      // Server-side search endpoint
      server.middlewares.use('/api/search/live', async (req, res) => {
        const url = new URL(req.url || '/', `http://localhost`);
        const query = url.searchParams.get('q');
        
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing query parameter ?q=' }));
          return;
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        try {
          // Try Bing first (most reliable for general web search)
          let results = await searchBing(query);
          
          // If Bing fails, try DuckDuckGo
          if (results.length === 0) {
            results = await searchDDG(query);
          }
          
          if (results.length > 0) {
            res.end(JSON.stringify({
              success: true,
              source: results === results ? 'bing' : 'ddg',
              text: formatResults(query, results),
              results: results.slice(0, 6),
            }));
          } else {
            // Last resort: try Wikipedia
            const wikiResult = await searchWikipedia(query);
            if (wikiResult) {
              res.end(JSON.stringify({
                success: true,
                source: 'wikipedia',
                text: `Here's what I found about "${query}", sir:\n\n${wikiResult}`,
                results: [],
              }));
            } else {
              res.end(JSON.stringify({
                success: false,
                text: `I couldn't find results for "${query}". Try:\n• https://www.google.com/search?q=${encodeURIComponent(query)}\n• Rephrase your question`,
                results: [],
              }));
            }
          }
        } catch (err: any) {
          res.end(JSON.stringify({
            success: false,
            text: `Search error: ${err.message}. Try: https://www.google.com/search?q=${encodeURIComponent(query)}`,
            results: [],
          }));
        }
      });
    },
  };
}
