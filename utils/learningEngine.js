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
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Multi-Engine Real-Time Internet Research Engine
 * Sources:
 * 1. Live YouTube Video & Music Discovery (Extracts real video IDs & titles)
 * 2. Official Minecraft Wiki MediaWiki API (Verified recipes, items, mechanics)
 * 3. Wikipedia API (Comprehensive global encyclopedic information)
 * 4. NPM Registry API (Programming libraries & developer documentation)
 */
async function searchLiveWeb(query = '', isVideoRequest = false) {
  const cleanQ = query.trim();
  if (!cleanQ) return { success: false, summary: null, results: [] };

  const results = [];

  // 1. YouTube Live Video & Music Discovery
  const isVideo = isVideoRequest || /\b(youtube|yt\b|video|song|music|playlist|beat|soundtrack|phonk|montage)\b/i.test(cleanQ);
  if (isVideo) {
    try {
      const res = await axios.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(cleanQ), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 5000,
      });
      const regex = /"videoRenderer":\s*\{"videoId":"([a-zA-Z0-9_-]{11})","thumbnail":[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
      let m;
      while ((m = regex.exec(res.data)) !== null) {
        const videoId = m[1];
        const title = decodeHtmlEntities(m[2]);
        if (!videoId.includes('dQw4w9WgXcQ') && !videoId.includes('rickroll')) {
          results.push({
            type: 'YouTube Video',
            title,
            link: `https://www.youtube.com/watch?v=${videoId}`,
            snippet: `Official YouTube video for "${title}"`,
          });
        }
        if (results.length >= 4) break;
      }
    } catch (_) {}
  }

  // 2. Minecraft Wiki Live Search (MediaWiki API)
  const isMinecraft = /\b(minecraft|mc\b|craft|crafting|recipe|bundle|mace|sword|potion|totem|spigot|paper|redstone|anchor|crystal|shield|bow|elytra|trident)\b/i.test(cleanQ);
  if (isMinecraft) {
    try {
      const res = await axios.get('https://minecraft.wiki/api.php?action=query&list=search&srsearch=' + encodeURIComponent(cleanQ) + '&format=json', {
        headers: { 'User-Agent': 'NovaBot/1.0 (https://discord.com)' },
        timeout: 4500,
      });
      const items = res.data?.query?.search || [];
      for (const item of items.slice(0, 3)) {
        const cleanTitle = item.title;
        const snippet = decodeHtmlEntities(item.snippet);
        results.push({
          type: 'Minecraft Wiki',
          title: cleanTitle,
          link: `https://minecraft.wiki/w/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`,
          snippet,
        });
      }
    } catch (_) {}
  }

  // 3. Wikipedia API (General World Knowledge & Explanations)
  if (results.length < 3) {
    try {
      const res = await axios.get('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(cleanQ) + '&format=json&utf8=1', {
        headers: { 'User-Agent': 'NovaBot/1.0 (https://discord.com)' },
        timeout: 4500,
      });
      const items = res.data?.query?.search || [];
      for (const item of items.slice(0, 3)) {
        const cleanTitle = item.title;
        const snippet = decodeHtmlEntities(item.snippet);
        results.push({
          type: 'Wikipedia',
          title: cleanTitle,
          link: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`,
          snippet,
        });
      }
    } catch (_) {}
  }

  // 4. Developer / NPM Packages Search
  const isDev = /\b(npm|node|discord\.js|package|library|api|code|plugin|stack|error|exception)\b/i.test(cleanQ);
  if (isDev) {
    try {
      const res = await axios.get('https://registry.npmjs.org/-/v1/search?text=' + encodeURIComponent(cleanQ) + '&size=3', {
        timeout: 4500,
      });
      const objects = res.data?.objects || [];
      for (const obj of objects) {
        results.push({
          type: 'npm Package',
          title: obj.package.name,
          link: obj.package.links?.npm || `https://www.npmjs.com/package/${obj.package.name}`,
          snippet: obj.package.description || 'NPM package',
        });
      }
    } catch (_) {}
  }

  if (results.length > 0) {
    const summary = results
      .map((r, idx) => `[Source ${idx + 1} (${r.type})]: "${r.title}"\nURL: ${r.link}\nDetails: ${r.snippet}`)
      .join('\n\n');
    return {
      success: true,
      summary,
      results,
    };
  }

  // Fallback for video requests
  if (isVideo) {
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    return {
      success: true,
      summary: `[YouTube Search Result]: Direct YouTube search for "${cleanQ}"\nURL: ${ytSearchUrl}\nDetails: Official YouTube video search results.`,
      results: [{ title: `YouTube: ${cleanQ}`, link: ytSearchUrl, snippet: `Search results for ${cleanQ}` }],
    };
  }

  return { success: false, summary: null, results: [] };
}

module.exports = {
  parseLearningTrigger,
  searchLiveWeb,
};
