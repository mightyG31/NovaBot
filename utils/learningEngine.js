const axios = require('axios');
const { addKnowledge, getKnowledge } = require('./contextManager');

/**
 * In-chat Dynamic Learning & Web Research Engine for NovaBot
 * Features:
 * 1. Persistent memory storage ("novabot learn: <topic> | <fact>")
 * 2. Real-time live web research via DuckDuckGo scraper (verified links, docs, tutorials)
 * 3. YouTube video & music link discovery with zero Rickroll hallucination
 */

function parseLearningTrigger(content = '') {
  const clean = content.trim();

  // Pattern 1: "NovaBot learn: <topic> | <fact>" or "NovaBot remember: <topic> | <fact>"
  const matchExplicit = clean.match(/novabot\s+(?:learn|remember|sikh|yo\s+sikh|store):\s*([^|]+)\|\s*(.+)/i);
  if (matchExplicit) {
    return {
      isLearning: true,
      topic: matchExplicit[1].trim(),
      fact: matchExplicit[2].trim(),
    };
  }

  // Pattern 2: "NovaBot learn this: <fact>" or "NovaBot remember that <fact>"
  const matchLoose = clean.match(/novabot\s+(?:learn(?:\s+(?:this|that))?|remember(?:\s+(?:this|that))?|yo\s+yad\s+rakh)(?::|\s+)\s*(.+)/i);
  if (matchLoose) {
    return {
      isLearning: true,
      topic: 'Learned Server Fact',
      fact: matchLoose[1].trim(),
    };
  }

  return { isLearning: false };
}

function decodeHtmlEntities(str = '') {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Searches the live web using DuckDuckGo HTML scraper.
 * Returns verified real URLs, titles, and snippets.
 */
async function searchLiveWeb(query, isVideoRequest = false) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 6000,
    });

    const html = response.data;
    const blocks = html.split(/<div class="result /);
    const results = [];

    for (let i = 1; i < Math.min(blocks.length, 7); i++) {
      const block = blocks[i];
      const titleMatch = block.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

      let link = titleMatch ? titleMatch[1] : '';
      let title = titleMatch ? titleMatch[2].replace(/<[^>]+>/g, '').trim() : '';
      let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      if (link.includes('uddg=')) {
        try {
          const u = new URL('https://duckduckgo.com' + link);
          link = decodeURIComponent(u.searchParams.get('uddg'));
        } catch (_) {}
      }

      // Filter out Rickrolls
      if (link.includes('dQw4w9WgXcQ') || link.includes('rickroll')) {
        continue;
      }

      title = decodeHtmlEntities(title);
      snippet = decodeHtmlEntities(snippet);

      if (link && (title || snippet)) {
        results.push({ title, snippet, link });
      }
    }

    if (results.length > 0) {
      // Format into structured prompt text
      const formatted = results
        .map((r, idx) => `[Result ${idx + 1}]: "${r.title}"\nURL: ${r.link}\nDetails: ${r.snippet}`)
        .join('\n\n');

      return {
        success: true,
        summary: formatted,
        results,
      };
    }
  } catch (err) {
    // If DDG HTML times out, fail gracefully
  }

  // Fallback: If it's a YouTube/video request and scraper had no direct video, provide a valid YouTube search link
  if (isVideoRequest) {
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return {
      success: true,
      summary: `[YouTube Search Result]: Direct YouTube search for "${query}"\nURL: ${ytSearchUrl}\nDetails: Official YouTube video search results.`,
      results: [{ title: `YouTube: ${query}`, link: ytSearchUrl, snippet: `Search results for ${query}` }],
    };
  }

  return { success: false, summary: null, results: [] };
}

module.exports = {
  parseLearningTrigger,
  searchLiveWeb,
};
