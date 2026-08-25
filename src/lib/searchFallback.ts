/**
 * Search fallback: when the smart router can't answer, query the web.
 * Uses DuckDuckGo Instant Answer API + Google search HTML scraping.
 * All requests go through the Vite dev proxy to avoid CORS.
 */

export async function searchWeb(query: string): Promise<string> {
  // ── Strategy 1: DuckDuckGo Instant Answer (good for factual queries) ──
  try {
    const ddgUrl = `/api/ddg/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, { method: 'GET', headers: { Accept: 'application/json' } });

    if (ddgRes.ok) {
      const data = await ddgRes.json();

      if (data.AbstractText && data.AbstractText.length > 20) {
        let result = data.AbstractText;
        if (data.AbstractURL) result += `\n\nSource: ${data.AbstractURL}`;
        return `Here's what I found, sir:\n\n${result}`;
      }

      if (data.RelatedTopics?.length > 0) {
        const topics = data.RelatedTopics
          .filter((t: any) => t.Text && t.Text.length > 10)
          .slice(0, 5)
          .map((t: any, i: number) => `${i + 1}. ${t.Text}`)
          .join('\n');
        if (topics) {
          return `Here's what I found about "${query}":\n\n${topics}\n\nFor more details: https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
      }
    }
  } catch (_e) { /* continue to next strategy */ }

  // ── Strategy 2: Google search HTML scraping (good for live/current data) ──
  try {
    const googleUrl = `/api/search/google?q=${encodeURIComponent(query)}&hl=en`;
    const googleRes = await fetch(googleUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (googleRes.ok) {
      const html = await googleRes.text();
      const results = parseGoogleResults(html);

      if (results.length > 0) {
        const formatted = results
          .slice(0, 6)
          .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`)
          .join('\n\n');

        return `Here's what I found about "${query}", sir:\n\n${formatted}\n\n💡 For more results: https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
  } catch (_e) { /* continue to fallback */ }

  // ── Strategy 3: Brave Search API (free tier, no key for basic) ──
  try {
    const braveUrl = `/api/search/brave?q=${encodeURIComponent(query)}`;
    const braveRes = await fetch(braveUrl, { method: 'GET' });
    if (braveRes.ok) {
      const data = await braveRes.json();
      if (data.web?.results?.length > 0) {
        const formatted = data.web.results.slice(0, 5).map((r: any, i: number) =>
          `${i + 1}. **${r.title}**\n   ${r.description}\n   ${r.url}`
        ).join('\n\n');
        return `Here's what I found about "${query}", sir:\n\n${formatted}`;
      }
    }
  } catch (_e) { /* continue to fallback */ }

  // ── Ultimate fallback ──
  return `I couldn't find a specific answer for "${query}", sir.\n\nYou can:\n• Search on Google: https://www.google.com/search?q=${encodeURIComponent(query)}\n• Ask me about stocks, weather, coding, science, history, or general knowledge.\n\nFor full AI-powered answers, connect Ollama in Settings.`;
}

/** Parse Google search HTML to extract titles, snippets, and URLs */
function parseGoogleResults(html: string): Array<{ title: string; snippet: string; url: string }> {
  const results: Array<{ title: string; snippet: string; url: string }> = [];

  // Extract search result blocks — Google uses <div class="g"> or <div data-hveid="...">
  // Each result typically has an <a href="..."> with an <h3> inside for title,
  // and a <span> or <div> with the snippet text.

  // Pattern 1: Standard organic results with <h3> tags inside <a> links
  const h3Pattern = /<a[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let match;
  while ((match = h3Pattern.exec(html)) !== null && results.length < 8) {
    const url = decodeURIComponent(match[1]);
    const title = stripHtml(match[2]);
    // Try to find the snippet near this position
    const snippet = extractSnippet(html, match.index + match[0].length, 300);
    if (title && title.length > 5) {
      results.push({ title, snippet, url });
    }
  }

  // Pattern 2: Fallback — find all <h3> tags and nearby text
  if (results.length === 0) {
    const h3Only = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    while ((match = h3Only.exec(html)) !== null && results.length < 8) {
      const title = stripHtml(match[1]);
      const snippet = extractSnippet(html, match.index + match[0].length, 300);
      if (title && title.length > 10 && !title.includes('People also ask') && !title.includes('Related searches')) {
        results.push({ title, snippet, url: '' });
      }
    }
  }

  return results;
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Extract text content from HTML after a given position */
function extractSnippet(html: string, fromPos: number, maxLen: number): string {
  const chunk = html.substring(fromPos, fromPos + maxLen);
  // Find the first text-heavy section (skip tags)
  const textOnly = stripHtml(chunk);
  // Take first meaningful sentence or two
  const sentences = textOnly
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && !s.startsWith('http'));
  return sentences.slice(0, 2).join('. ').substring(0, 200) || '';
}
