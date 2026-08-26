/**
 * Search fallback: when the smart router can't answer, query the web.
 * Uses a server-side proxy that scrapes Bing/DuckDuckGo/Wikipedia
 * to avoid CORS and bot detection issues.
 */

export async function searchWeb(query: string): Promise<string> {
  // ── Strategy 1: Server-side search proxy (Bing + DDG + Wikipedia) ──
  try {
    const res = await fetch(`/api/search/live?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text) {
        return data.text;
      }
    }
  } catch (_e) { /* continue to fallback */ }

  // ── Strategy 2: Wikipedia API (always works, free, no key) ──
  try {
    // Extract the main topic from the query
    const topic = query
      .replace(/^(what|who|when|where|why|how|tell me about|explain|describe)\s+(is|are|was|were|the|about)?\s*/i, '')
      .replace(/\?/g, '')
      .trim();

    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const wikiRes = await fetch(wikiUrl, {
      headers: { Accept: 'application/json' },
    });

    if (wikiRes.ok) {
      const data = await wikiRes.json();
      if (data.extract && data.extract.length > 20) {
        let result = data.extract;
        if (data.content_urls?.desktop?.page) {
          result += `\n\nSource: ${data.content_urls.desktop.page}`;
        }
        return `Here's what I found about "${query}", sir:\n\n${result}\n\n💡 For more: https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
  } catch (_e) { /* continue to fallback */ }

  // ── Ultimate fallback: provide a Google search link ──
  return `I searched for "${query}" but couldn't retrieve a direct answer right now.\n\n🔍 Search yourself:\nhttps://www.google.com/search?q=${encodeURIComponent(query)}\n\n💡 For full AI-powered answers, make sure Ollama is running with a model loaded.`;
}
