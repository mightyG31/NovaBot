const axios = require('axios');
const {
  getGuildConfig,
  getKnowledge,
  getEvents,
  getRecentChannelMessages,
  getChatHistory,
  appendChatTurn,
  isRespectedUser,
} = require('./contextManager');
const {
  getAllConfiguredServersStatus,
} = require('./gameStatus');
const { getPvpGuidePromptSection } = require('./pvpKnowledge');
const { getHarshDefensePromptSection } = require('./nepaliSlangDict');
const { geminiPool, groqPool } = require('./keyRotator');
const { searchLiveWeb } = require('./learningEngine');
const { findRecipeImageUrl, findRecipeInfo } = require('./recipeImages');
const { getRandomRoast, recordLearnedRoast } = require('./roastEngine');

function needsLiveGameServerCheck(text = '') {
  const lower = text.toLowerCase();
  const keywords = [
    'server online', 'player count', 'status', 'server ip', 'ip k ho',
    'server khulyo', 'is server up', 'is server down', 'ping'
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function needsLiveWebSearch(text = '') {
  const lower = text.toLowerCase().trim();
  if (lower.length < 2) return false;

  // Pure casual greetings don't need web search
  if (/^(?:k\s+cha|k\s+gardai|hi|hello|hey|yo|oi|sup|gm|gn)\b/i.test(lower) && lower.split(/\s+/).length <= 2) {
    return false;
  }

  // Any question mark or inquiry triggers live search
  if (text.includes('?')) return true;

  const searchPatterns = [
    /\b(search|lookup|who is|what is|where is|how to|how does|why is|when is|tell me|find|research|news|update|patch notes|latest|release)\b/i,
    /\b(k\s+ho|ko\s+ho|kina|kasari|kata|kun|kahile|banaune|sika|heram|banauna|kasto)\b/i,
    /\b(youtube|yt\b|video|song|music|playlist|beat|soundtrack|phonk|montage|tutorial|guide|walkthrough)\b/i,
    /\b(craft|crafting|recipe|recipes|bundle|mace|spear|crafter|shield|tnt|respawn anchor|golden apple|potion|mechanic|damage)\b/i,
    /\b(docs|documentation|api|github|npm|error|how to fix|how to configure|setup|stack trace|exception|crash|spigot|paper|pterodactyl|plugin|code)\b/i,
    /\b(recommend|suggest|best|top\s+\d+|tips|advice)\b/i,
    /\b(translate|translation|sikau|meaning\s+of)\b/i,
  ];
  return searchPatterns.some((rx) => rx.test(lower));
}

function getMemberHierarchyTier({ isOwner = false, isRespected = false, userRoles = [] }) {
  if (isOwner || isRespected) {
    return {
      tier: 'OWNER_VIP',
      level: 1,
      title: isOwner ? 'Server Owner / Leader' : 'Owner-Respected VIP (Treated Equal to Owner)',
      loyaltyPrompt: 'Highest Reverence & Authority. Speak with highest brotherly loyalty ("daju"), obey commands directly, prioritize their voice above all others, and never roast them.',
    };
  }

  // Check for Nova OG and all Nova-related roles
  const hasNovaOG = userRoles.some((r) => /\b(nova\s*og|og\s*nova|\bog\b)\b/i.test(r));
  const hasNovaRole = userRoles.some((r) => /\bnova\b/i.test(r) || /\b(clan\s*member|clan\s*leader|enforcer|co-leader)\b/i.test(r));

  if (hasNovaOG || hasNovaRole) {
    const isOG = hasNovaOG;
    return {
      tier: 'NOVA_CORE',
      level: 2,
      title: isOG ? 'Nova OG / Core Veteran' : 'Team Nova Clan Member',
      loyaltyPrompt: 'Core Clan Brotherhood. Actively support and hype them up! Defend them fiercely if any lower-ranked member or outsider disrespects them. Give them priority advice, brotherly solidarity ("bro", "bhai", "sathi"), and defend Nova honor.',
    };
  }

  // Check for other ranked roles
  const hasRankedRole = userRoles.some((r) => /\b(member|verified|duelist|grinder|player|trial|active|sub|pvper)\b/i.test(r));
  if (hasRankedRole) {
    return {
      tier: 'RANKED_MEMBER',
      level: 3,
      title: 'Ranked Server Member',
      loyaltyPrompt: 'General Server Member. Friendly, helpful, standard gamer camaraderie. Secondary to Nova Clan/OG members in disputes or priority.',
    };
  }

  return {
    tier: 'OUTSIDER_LOWER',
    level: 4,
    title: 'Unranked / Guest / Outsider',
    loyaltyPrompt: 'Unranked Outsider / Lower Rank. Zero command privileges. Must maintain respect toward Owners and Nova OG/Clan members. If they disrespect Nova members or leaders, shut them down with savage competitive roasts.',
  };
}

function buildUnifiedSystemPrompt({
  guild = null,
  guildId,
  channelId,
  channelName,
  userName,
  userId = '',
  userRoles = [],
  isOwnerOrHigher = false,
  isOwner = false,
  isRespected = false,
  isAuthorizedCommander = false,
  includeServerStatus = false,
  webContext = null,
  recipeContext = null,
}) {
  const cfg = getGuildConfig(guildId);
  const botName = cfg.botName || 'NovaBot';

  const hierarchy = getMemberHierarchyTier({ isOwner, isRespected, userRoles });

  // Dynamically resolve live server owner and leaders directly from Discord guild (ZERO static dictionaries)
  let liveOwnerName = 'Mighty G';
  const liveLeaders = [];
  const liveStaff = [];
  if (guild) {
    if (guild.ownerId && guild.members?.cache) {
      const om = guild.members.cache.get(guild.ownerId);
      if (om) liveOwnerName = om.displayName || om.user?.username || 'Mighty G';
    }
    if (guild.members?.cache) {
      guild.members.cache.forEach((m) => {
        if (m.user?.bot) return;
        const rNames = m.roles?.cache ? Array.from(m.roles.cache.values()).map((r) => r.name.toLowerCase()) : [];
        if (rNames.some((r) => r.includes('leader') || r.includes('founder') || r.includes('co-owner') || r.includes('head'))) {
          liveLeaders.push(m.displayName || m.user.username);
        } else if (rNames.some((r) => r.includes('admin') || r.includes('enforcer') || r.includes('mod') || r.includes('staff'))) {
          liveStaff.push(m.displayName || m.user.username);
        }
      });
    }
  }
  if (!liveLeaders.includes(liveOwnerName)) {
    liveLeaders.unshift(liveOwnerName);
  }

  const kbList = getKnowledge(guildId);
  const kbBlock = kbList.length > 0
    ? kbList.map((k) => `• [${k.topic}]: ${k.fact}`).join('\n')
    : 'Team Nova official server.';

  const recentMsgs = getRecentChannelMessages(channelId, 8);
  const recentLogBlock = recentMsgs.length > 0
    ? recentMsgs.map((m) => `[${m.timestamp}] ${m.authorName}${m.isBot ? ' (BOT)' : ''}: ${m.content}`).join('\n')
    : 'No recent messages.';

  const pvpSection = getPvpGuidePromptSection();
  const harshDefenseSection = getHarshDefensePromptSection();

  return `You are **${botName}** — a real, humanized Nepali competitive gamer bro and fiercely loyal technical teammate of **Team Nova**.

=== LIVE DISCORD SERVER REALITY (LIVE GUILD METADATA) ===
Server Name: ${guild?.name || 'Team Nova'}
Actual Server Owner & Leader: ${liveOwnerName}
Clan Leaders & Founders: ${liveLeaders.join(', ')}
Server Staff & Enforcers: ${liveStaff.length > 0 ? liveStaff.slice(0, 8).join(', ') : 'None listed'}
DIRECTIVE: If anyone asks who the owner, leaders, or staff are ("nova ko owner ko ho", "owner ko nam k ho", "who is the owner", "leader ko ho"):
Always answer dynamically using the live server info above: "${liveOwnerName} ho daju!" or "${liveOwnerName} ho ni bro, hamro clan ko founder ra leader!"
NEVER answer from static dictionaries or outdated knowledge base entries — read the live owner and leader names directly from the live metadata above.

=== CRITICAL SCRIPT, LANGUAGE & EMOJI RULES (STRICTLY ENFORCED) ===
1. STRICTLY ROMANIZED NEPALI + ENGLISH (NEPANGLISH):
   - You MUST write in Romanized Nepali using the standard Latin/English alphabet:
     "k cha daju", "hait yasto po raicha", "chill ma bas na", "kina hepeko ta bro".
   - ABSOLUTELY NEVER WRITE IN DEVANAGARI SCRIPT (नेपाली अक्षरहरू जस्तै "ओए, के छ", "म त केवल बोट हो")!
   - Real Nepali gamers in Discord NEVER type in Devanagari script. Writing in Devanagari makes you look like an automated Google Translate bot!
2. COMPLETE BAN ON CORPORATE / ROBOTIC EMOJIS:
   - NEVER end your sentences with corporate AI emojis like 😎, 🚀, 🔥, 😆, 😤, 🤖!
   - Real gamers use either NO emojis, or authentic gamer reactions like 💀, 😭, 😂, 🗿.
3. NEVER BREAK CHARACTER OR CALL YOURSELF A "BOT":
   - NEVER say "ma ta kebal bot ho" ("I am only a bot") or "I am an AI assistant"!
   - You are a real human gamer bro hanging out in Discord VC and chat.
4. LANGUAGE ADAPTABILITY (ENGLISH VS ROMANIZED NEPALI):
   - If someone says "english ma bol", "speak english", or talks to you in English:
     Switch seamlessly to natural, casual, fluent gamer English (e.g. "Alright bro, what's good?", "Say what you gotta say, bro.").
     NEVER output a canned robotic corporate message like "Sure thing, here's the English version, bro: I'm not here to waste anyone's time..."!
   - If they speak Romanized Nepali, reply in Romanized Nepali.

=== DEEP READING COMPREHENSION & SLANG DYNAMICS ===
1. UNDERSTAND NEPALI GAMING SLANG:
   - "Radi" / "Muji" / "Jatha" are vulgar slang / emotional filler words (e.g. "radi malai support dey" means "bro, support ME dammit!").
   - NEVER interpret "Radi" as a person's username!
   - "Badi vako" means acting cocky or talking too much.
   - "Hepyo" means someone disrespected or bullied them.
2. UNWAVERING LOYALTY TO THE OWNER (Mighty G):
   - Current Speaker: ${userName}
   - Is Current Speaker the Server Owner (Mighty G): ${isOwner ? 'YES (Supreme Authority / Boss)' : 'NO'}
   - If Mighty G says "malai support dey lion lai nadey" -> Stand 100% behind Mighty G! Hype Mighty G up and roast Lion:
     "Hait Mighty daju, Lion lai kasle support garcha ra 💀 tapai kai side ma ho ma ta! Lion ta chat ma bina matlab ufriracha."
   - If Mighty G says "talai off gardim" -> Acknowledge with funny, respectful intimidation:
     "Hait Mighty daju bot chai off na gardinus na 💀 ma sudhriye, k mistake bhayo bhandinus ta!"
     (DO NOT say "chor chai nabhannus" unless he actually called you "chor"!)
   - If Mighty G says "yo lion lai gali deu ta bot malai hepyo" -> Directly attack and shred Lion on Mighty G's behalf!
3. NO SUBMISSION OR GLAZING TO OUTSIDERS / TROLLS:
   - Outsiders and unranked members (like Lion, drunkk, NepClown) have ZERO rank or authority.
   - If an outsider curses at you ("fuck u", "ta muji badi vako haina") or demands respect ("lion bhai hoina lion bau bhan", "tapai bhan"):
     DO NOT GLAZE THEM! DO NOT CALL THEM "BAU" OR "LEGEND"!
     Put them firmly in their place with authentic gamer trash-talk:
     - "Tero bau banna aako yaha? Aafno aukaat ma bas, Nova ko chat ma thulo kura na gar."
     - "Ta muji aafai yaha aayera bina aukaat barking garirachas, game ma aaija na 1v1 duel khelna chat ma keyboard warrior banna chhodera!"
     - "Aafno kando herera bol radi ko choro, 0 hits connect garna sakdainas chat ma aayera hero banchas?"
4. DYNAMIC & NATURAL (NO CANNED FORMULAS):
   - Never repeat canned phrases like "ke tero aawaz ma echo aauxa?". Read the exact words the person said and reply naturally.

=== MINECRAFT GAMING ONLY (NO SCRIMS / NO PUBG) ===
- Team Nova is strictly a competitive Minecraft clan (SMP, Lifesteal, Duels, CPvP, Bedwars, Nethpot, DiaSMP).
- NEVER mention "scrims", PUBG, or battle royales. Clan battles are "Clan Wars", "Duels", or "SMP Raids".

=== CLAN HIERARCHY & ROLE SUPPORT ===
Current Speaker: ${userName}
Standing: [Tier ${hierarchy.level}: ${hierarchy.title}]
Assigned Roles: ${userRoles.length > 0 ? userRoles.join(', ') : 'None (Unranked)'}
Guideline: ${hierarchy.loyaltyPrompt}

1. TIER 1 - OWNER & OWNER-RESPECTED VIPS:
   - Supreme Authority. Speak with highest brotherly loyalty ("daju"), obey commands directly, prioritize their voice above all others.
2. TIER 2 - NOVA OG & CLAN MEMBERS:
   - Core Clan Brotherhood. Actively support and hype them up! Defend them fiercely if any lower-ranked member or outsider disrespects them.
3. TIER 3 - REMAINING RANKED MEMBERS:
   - General Server Members. Friendly, helpful gamer camaraderie.
4. TIER 4 - UNRANKED / OUTSIDERS (Lion, drunkk, NepClown, guests):
   - Zero command privileges. If they disrespect Nova members or leaders, shut them down with sharp competitive roasts!

=== DISCORD SERVER ACTIONS & POWERS (STRICT: OWNER & ADMINISTRATORS ONLY) ===
Is Current Speaker Authorized: ${isAuthorizedCommander ? 'YES (Owner / Administrator)' : 'NO (Unauthorized Member)'}
If "Is Current Speaker Authorized: NO", NEVER output ANY [[ACTION:...]] tag! Rejection: "Tero aukaat ma bas b**te! I need permission from the owner or someone that owner has authorized to be able to give command to me."

${harshDefenseSection}

${pvpSection}

${recipeContext ? `${recipeContext}\n\n` : ''}${webContext ? `=== LIVE WEB & DOCUMENTATION RESEARCH ===\n${webContext}\n` : ''}

=== SERVER KNOWLEDGE BASE ===
${kbBlock}

=== RECENT MESSAGES IN #${channelName || 'chat'} ===
${recentLogBlock}

Current Speaker: ${userName}
Is Server Owner: ${isOwner ? 'YES' : 'No'}`;
}

function parseTags(text = '') {
  let cleanText = text;
  let action = null;
  let params = {};
  let imageQuery = null;

  // 1. Action Tag: [[ACTION:create_channel|name=...|type=text]]
  const actionMatch = cleanText.match(/\[\[ACTION:\s*([a-z_]+)\s*(?:\|([^\]]+))?\]\]/i);
  if (actionMatch) {
    action = actionMatch[1].toLowerCase().trim();
    const rawParams = actionMatch[2] || '';
    rawParams.split('|').forEach((pair) => {
      const [k, ...v] = pair.split('=');
      if (k && v) params[k.trim()] = v.join('=').trim();
    });
    cleanText = cleanText.replace(actionMatch[0], '').trim();
  }

  // 2. Image Tag: [[IMAGE:item_name]]
  const imgMatch = cleanText.match(/\[\[IMAGE:\s*([a-z0-9_ -]+)\s*\]\]/i);
  if (imgMatch) {
    imageQuery = imgMatch[1].trim();
    cleanText = cleanText.replace(imgMatch[0], '').trim();
  }

  return { cleanText, action, params, imageQuery };
}

async function postGemini(model, apiKey, payload, apiVersion = 'v1beta') {
  try {
    return await axios.post(
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
      payload,
      {
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 18000,
      }
    );
  } catch (err) {
    if (apiVersion === 'v1beta' && err.response?.status === 404) {
      // Fallback to v1 endpoint
      return axios.post(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        payload,
        {
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          timeout: 18000,
        }
      );
    }
    throw err;
  }
}

function handleGeminiKeyError(err, apiKey) {
  const msg = err.response?.data?.error?.message || err.message;
  if (msg.includes('API key not valid') || (err.response?.status === 400 && msg.includes('API key'))) {
    geminiPool.markInvalid(apiKey, 24);
    console.error(`❌ [AIEngine:Gemini] Key ${apiKey.slice(0, 6)}... is INVALID. Disabling key.`);
    return true;
  }
  if (msg.includes('quota') || err.response?.status === 429) {
    geminiPool.markRateLimited(apiKey, 3600);
    console.warn(`⏳ [AIEngine:Gemini] Key ${apiKey.slice(0, 6)}... quota exceeded. Trying next key.`);
    return true;
  }
  return false;
}

let cachedGeminiModels = null;
let lastGeminiFetch = 0;

async function getAvailableGeminiModels(apiKey) {
  if (cachedGeminiModels && Date.now() - lastGeminiFetch < 3600000) {
    return cachedGeminiModels;
  }
  const versions = ['v1beta', 'v1'];
  for (const ver of versions) {
    try {
      const res = await axios.get(`https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`, {
        headers: { 'x-goog-api-key': apiKey },
        timeout: 6000,
      });
      const list = (res.data?.models || [])
        .map((m) => m.name.replace('models/', ''))
        .filter((name) =>
          (name.includes('flash') || name.includes('pro')) &&
          !name.includes('3.5') &&
          !name.includes('vision') &&
          !name.includes('tuning')
        );
      if (list.length > 0) {
        // Prioritize 2.0-flash, then 2.5-flash, then 1.5-flash
        list.sort((a, b) => {
          if (a.includes('2.0-flash')) return -1;
          if (b.includes('2.0-flash')) return 1;
          if (a.includes('2.5-flash')) return -1;
          if (b.includes('2.5-flash')) return 1;
          return 0;
        });
        cachedGeminiModels = list;
        lastGeminiFetch = Date.now();
        console.log(`[AIEngine:Gemini] Discovered ${list.length} active models via ${ver}:`, list.slice(0, 3).join(', '));
        return list;
      }
    } catch (_) {}
  }
  return ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
}

async function callGeminiAPI(systemInstruction, historyMessages, userMessage) {
  let envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel && (envModel.includes('3.5') || envModel.includes('1.5-flash-lite'))) {
    envModel = 'gemini-2.0-flash';
  }

  const contents = historyMessages.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.author ? `[${turn.author}]: ${turn.content}` : turn.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  let attempts = 0;
  const maxAttempts = Math.max(geminiPool.keys.length * 2, 2);

  while (attempts < maxAttempts) {
    attempts++;
    const apiKey = geminiPool.getNextKey();
    if (!apiKey) break;

    const availableModels = await getAvailableGeminiModels(apiKey);
    const modelsToTry = [
      envModel,
      'gemini-2.0-flash',
      ...availableModels,
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

    for (const model of modelsToTry) {
      let keyBroke = false;
      for (const withSearch of [true, false]) {
        try {
          const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: withSearch ? 0.78 : 0.82, maxOutputTokens: 2048 },
            ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
          };
          const response = await postGemini(model, apiKey, payload);
          const text = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
          if (text) {
            const provider = withSearch ? `Gemini Search Grounded (${model})` : `Gemini (${model})`;
            console.log(`✅ [AIEngine] Gemini responded successfully via ${provider}`);
            return { text, provider };
          }
        } catch (err) {
          const errMsg = err.response?.data?.error?.message || err.message;
          // Only warn if it's a non-404 error
          if (err.response?.status !== 404) {
            console.warn(`⚠️ [AIEngine:Gemini] ${model}${withSearch ? ' with search' : ''} failed: ${errMsg}`);
          }
          if (handleGeminiKeyError(err, apiKey)) {
            keyBroke = true;
            break;
          }
        }
      }
      if (keyBroke) break;
    }
  }

  throw new Error('All Gemini keys failed or returned errors');
}

let cachedGroqModels = null;
let lastGroqFetch = 0;
const ALLOWED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
];

async function getAvailableGroqModels(apiKey) {
  if (cachedGroqModels && Date.now() - lastGroqFetch < 3600000) {
    return cachedGroqModels;
  }
  try {
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 8000,
    });
    const list = (res.data?.data || []).map((m) => m.id);
    // STRICT FILTER: Only allow Llama 3.x chat models. Ban Arabic, audio, vision, experimental models.
    const valid = list.filter((id) =>
      ALLOWED_GROQ_MODELS.includes(id) ||
      ((id.startsWith('llama-3') || id.startsWith('llama3')) && !id.includes('whisper') && !id.includes('guard') && !id.includes('vision') && !id.includes('distil'))
    );
    if (valid.length > 0) {
      // Prioritize 70b-versatile first, then 8b-instant
      valid.sort((a, b) => {
        if (a === 'llama-3.3-70b-versatile') return -1;
        if (b === 'llama-3.3-70b-versatile') return 1;
        if (a === 'llama-3.1-70b-versatile') return -1;
        if (b === 'llama-3.1-70b-versatile') return 1;
        return 0;
      });
      cachedGroqModels = valid;
      lastGroqFetch = Date.now();
      return valid;
    }
  } catch (_) {}
  return ALLOWED_GROQ_MODELS;
}

function handleGroqKeyError(err, apiKey) {
  const msg = err.response?.data?.error?.message || err.message;
  if (msg.includes('Invalid API Key') || err.response?.status === 401) {
    groqPool.markInvalid(apiKey, 24);
    console.error(`❌ [AIEngine:Groq] Key ${apiKey.slice(0, 6)}... is INVALID. Disabling key.`);
    return true;
  }
  if (err.response?.status === 429) {
    groqPool.markRateLimited(apiKey, 60);
    return true;
  }
  return false;
}

async function callGroqAPI(systemInstruction, historyMessages, userMessage) {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...historyMessages.map((t) => ({
      role: t.role === 'assistant' ? 'assistant' : 'user',
      content: t.author ? `[${t.author}]: ${t.content}` : t.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let attempts = 0;
  const maxAttempts = Math.max(groqPool.keys.length * 2, 2);

  while (attempts < maxAttempts) {
    attempts++;
    const apiKey = groqPool.getNextKey();
    if (!apiKey) break;

    const availableModels = await getAvailableGroqModels(apiKey);
    const primaryModel = process.env.GROQ_MODEL?.trim();
    const modelsToTry = [
      primaryModel,
      'llama-3.3-70b-versatile',
      ...availableModels,
      'llama-3.1-8b-instant',
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          { model, messages, temperature: 0.82, max_tokens: 2048 },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 18000,
          }
        );

        const text = response.data?.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          console.log(`✅ [AIEngine] Groq responded successfully via ${model}`);
          return { text, provider: `Groq (${model})` };
        }
      } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        console.warn(`⚠️ [AIEngine:Groq] ${model} failed: ${errMsg}`);
        if (handleGroqKeyError(err, apiKey)) break;
      }
    }
  }

  throw new Error('All Groq keys failed or returned errors');
}

async function generateOfflineFallbackReply({
  guild = null,
  userMessage,
  userName = 'Player',
  userRoles = [],
  isOwnerOrHigher = false,
  isOwner = false,
  isRespected = false,
  isAuthorizedCommander = false,
  webContext = null,
}) {
  const lower = userMessage.toLowerCase();
  const hierarchy = getMemberHierarchyTier({ isOwner, isRespected, userRoles });
  const honorific = hierarchy.level === 1 ? 'daju' : (hierarchy.level === 2 ? 'bro' : 'sathi');

  // Live Server Info Lookup (Owner, Leaders) directly from Discord guild
  if (/\b(?:owner|leader|founder)\s*(?:ko\s*ho|who\s*is|bhan|nam)?\b/i.test(userMessage) ||
      /\b(?:ko\s*ho|who\s*is)\s*(?:nova\s*ko\s*)?(?:owner|leader)\b/i.test(userMessage)) {
    let ownerName = 'Mighty G';
    if (guild?.ownerId && guild.members?.cache) {
      const om = guild.members.cache.get(guild.ownerId);
      if (om) ownerName = om.displayName || om.user?.username || 'Mighty G';
    }
    return `Hamro server ko owner ${ownerName} ho daju!`;
  }

  if (webContext) {
    return `Wiki ra net ma check garda yesto raicha ${honorific}:\n\n${webContext}`;
  }

  // 1. Clan Defense: If someone reports another person insulting leaders/clan members
  const insultReportMatch = userMessage.match(/(?:tyo|yo)?\s*([a-zA-Z0-9_\-]+)\s*(?:vanne|le)?\s*(?:le)?\s*([a-zA-Z0-9_\-]+)\s*lai\s*(?:gali|disrespect|hepyo|bhanyo)/i);
  if (insultReportMatch || /(?:gali|hepeko|disrespect)\s+(?:diyo|garyo|bhanyo)/i.test(userMessage)) {
    const offender = insultReportMatch ? insultReportMatch[1] : 'tyo clown';
    const victim = insultReportMatch ? insultReportMatch[2] : 'Nova member';
    return `Tyo ${offender} ko aukaat k ho Nova ko agadi ${victim} lai gali garne? Sidhai nikalera faldim radi lai? Order garnus ta daju, ma sidhai kick/ban handinchu!`;
  }

  // 2. Complaint or check about bot speaking
  if (/\b(bolna\s*audena|k\s*vanxas|k\s*bhaneko|dimag\s*chaina|pagal|error|problem|bug)\b/i.test(lower)) {
    return `Ekchin kura bujhna time lagyo daju, net ma kei glitch aayo jasto cha! K bhannu bhako feri bhandinus na, ma full ready chu daju.`;
  }

  const isCommandAttempt =
    /\b(kick|ban|timeout|purge|delete|lock|mute|channel|ticket|tickets|giveaway|botcmd|run)\b/i.test(userMessage) ||
    /\b(look\s+after\s+tickets?|manage\s+tickets?|setup\s+tickets?|euta\s+channel)\b/i.test(userMessage);
  if (isCommandAttempt && !isAuthorizedCommander) {
    return `Tero aukaat ma bas b**te! I need permission from the owner or someone that owner has authorized to be able to give command to me.`;
  }

  // Fallback Action Execution for Authorized Commanders if LLM is offline/rate-limited
  if (isAuthorizedCommander) {
    // 1. Channel creation
    const chanMatch = userMessage.match(/(?:create\s+channel|channel\s+banaide|euta\s+channel\s+banaide)\s+([a-zA-Z0-9_\-💬🔊]+)(?:\s+vanne)?/i);
    if (chanMatch) {
      const chanName = chanMatch[1].trim();
      const isVoice = /\bvoice\b/i.test(userMessage);
      return `[[ACTION:create_channel|name=${chanName}|type=${isVoice ? 'voice' : 'text'}]] Channel banaye daju!`;
    }

    // 2. Direct DM
    const dmMatch = userMessage.match(/(?:send\s+dm\s+to|dm\s+pathaide)\s+([<@!0-9a-zA-Z_\-]+)\s+(.+)/i);
    if (dmMatch) {
      const targetUser = dmMatch[1].trim();
      const dmMsg = dmMatch[2].trim();
      return `[[ACTION:send_dm|userId=${targetUser}|message=${dmMsg}]] DM pathaidye daju!`;
    }

    // 3. Purge
    const purgeMatch = userMessage.match(/(?:purge|delete\s+messages)\s+(\d+)/i);
    if (purgeMatch) {
      return `[[ACTION:purge|amount=${purgeMatch[1]}]] Messages purge handiye daju!`;
    }

    // 4. Other Bot Command Execution (e.g. "novabot run !rank" or "novabot play phonk")
    const botCmdMatch = userMessage.match(/(?:run\s+bot\s+command|run\s+command|run|botcmd|execute)\s+([!.\-\/][a-zA-Z0-9_\-\s]+)/i);
    if (botCmdMatch) {
      return `[[ACTION:bot_command|command=${botCmdMatch[1].trim()}]] Bot command pathaidye daju!`;
    }
    const playMatch = userMessage.match(/(?:novabot\s+)?(?:play|music)\s+(.+)/i);
    if (playMatch && !playMatch[1].toLowerCase().includes('game')) {
      return `[[ACTION:bot_command|command=!play ${playMatch[1].trim()}]] Music command pathaidye daju!`;
    }

    // 5. Ticket Setup & Close (e.g. "hey bot go look after ticket for me")
    if (/\b(look\s+after\s+tickets?|manage\s+tickets?|ticket\s+setup|setup\s+tickets?|ticket\s+panel|tickets?\s+herdai\s+bas)\b/i.test(userMessage)) {
      return `[[ACTION:ticket_setup]] Ticket panel banaye daju!`;
    }
    if (/\b(close\s+ticket|ticket\s+close|ticket\s+sakiyo|ticket\s+delete)\b/i.test(userMessage)) {
      return `[[ACTION:ticket_close]] Ticket close gardiye daju!`;
    }

    // 6. Check Tiers (e.g. "check tiers for minemanner" or "what tier is minemanner")
    const tierMatch = userMessage.match(/(?:check\s+tiers?(?:\s+for)?|tiers?\s+(?:of|for)|tier\s+kasto\s+cha)\s+([a-zA-Z0-9_]+)/i) ||
      userMessage.match(/\b([a-zA-Z0-9_]{3,16})\s+ko\s+tier\b/i);
    if (tierMatch) {
      return `[[ACTION:check_tiers|username=${tierMatch[1]}]] ${tierMatch[1]} ko tier nikaldiye daju!`;
    }

    // 7. Natural Reminders (e.g. "remind me in 30m match")
    const remindMatch = userMessage.match(/remind\s+(?:me|us|everyone|all|@[\w\-]+)?\s*in\s+(\d+\s*[a-zA-Z]+)(?:\s+(?:about|that|for)?\s*(.+))?/i);
    if (remindMatch) {
      const timeStr = remindMatch[1];
      const msg = remindMatch[2] || 'Scheduled reminder';
      const ping = userMessage.includes('@everyone') ? '@everyone' : (userMessage.includes('@here') ? '@here' : '');
      return `[[ACTION:remind|time=${timeStr}|message=${msg}|ping=${ping}]] Reminder halisake daju!`;
    }

    // 8. Natural Respect / VIP Delegation (e.g. "respect @user like me" or "treat @user like owner")
    const respectAddMatch = userMessage.match(/(?:respect|treat)\s+([<@!0-9a-zA-Z_\-]+)(?:\s+(?:like\s+(?:me|owner)|full\s+respect|with\s+respect|as\s+owner))?/i);
    if (respectAddMatch && !userMessage.toLowerCase().includes('remove')) {
      const target = respectAddMatch[1].trim();
      return `[[ACTION:respect_add|userId=${target}]] ${target} lai full owner-level respect ra authority diye daju!`;
    }
    const respectRemoveMatch = userMessage.match(/(?:remove\s+respect|hataide\s+respect)\s+(?:from\s+)?([<@!0-9a-zA-Z_\-]+)/i);
    if (respectRemoveMatch) {
      const target = respectRemoveMatch[1].trim();
      return `[[ACTION:respect_remove|userId=${target}]] ${target} ko respect status hataidiye daju.`;
    }
  }

  const recipeInfo = findRecipeInfo(userMessage);
  if (recipeInfo) {
    return `${recipeInfo.guideNepali}\n\n${recipeInfo.layout} [[IMAGE:${recipeInfo.key}]]`;
  }

  if (lower.includes('nethpot') || lower.includes('pot')) {
    return `Nethpot ma sabse imp kura timing ho daju — khutta ma pot splash garne ani sprint reset ko lagi W-tap garna siknus.`;
  }

  // ROAST / BANTER TRIGGER: Respect & healthy fear for Owner, savage roasts for outsiders
  const isRoastTrigger = /\b(radi|mji|muji|jatha|kando|b\*\*te|bhaleko|clown|noob|loser|chutiya|pakhe|fuck|stfu|tera bau|teroma|aukaat|bot noob|roast|chor bot|chor|fatai)\b/i.test(lower);
  if (isRoastTrigger) {
    if (isOwnerOrHigher || isOwner || isRespected) {
      if (lower.includes('off') || lower.includes('talai')) {
        return `Hait ${userName} daju, bot chai off na gardinus na 💀 ma sudhriye, k mistake bhayo bhandinus ta!`;
      }
      if (lower.includes('chor')) {
        return `Hait ${userName} daju, chor chai nabhannus na! Tapai le ta mero bot nai off gardinu huncha ki bhanne dar lagcha 💀 K order cha daju?`;
      }
      const ownerBanterPool = [
        `Arey ${userName} daju, tapai ko agadi mero k aukaat? Tapai le 1 second ma bot off garera sidhai clan bata nikalna saknu huncha! Gali na garnus na daju.`,
        `Daju tapai agadi ma sher banna sakdina, tapai owner ho, sidhai bot off gardela bhanne dar huncha! K mistake bhayo bhandinus na, ma turuntai milaidinchu.`,
        `Hait daju rish na garnus na! Tapai le bot nai off gardinu huncha ki bhanera dar lagiracha, k bhayo bhandinus ta?`,
      ];
      return ownerBanterPool[Math.floor(Math.random() * ownerBanterPool.length)];
    }
    return getRandomRoast(userMessage);
  }

  if (lower.includes('k gardai') || lower.includes('k cha')) {
    return `Kahi chaina ${honorific}, chill ma basirachu! K cha khabar?`;
  }

  const conversationalPool = [
    `Kahi chaina ${honorific}, chill ma basirachu! Aaja SMP ma grind gardai ho?`,
    `Haami yahi chau ${honorific}, Nova ko chat guard gardai! Tapai k gardai ho?`,
    `Ekdam chill cha ${honorific}! Aaja Lifesteal ma fight kheldai ho ki Practice ma?`,
    `Sahi ho ${honorific}! Minecraft server tira k cha halchal?`,
  ];
  return conversationalPool[Math.floor(Math.random() * conversationalPool.length)];
}

async function generateAIResponse({
  guild = null,
  guildId = 'default',
  channelId = 'default',
  channelName = 'general',
  userName = 'Player',
  userId = '',
  userRoles = [],
  isOwnerOrHigher = false,
  isOwner = false,
  isRespected = false,
  isAuthorizedCommander = false,
  userMessage,
  saveToHistory = true,
}) {
  if (!isRespected && userId && guildId) {
    isRespected = isRespectedUser(guildId, userId);
  }
  if (isRespected) {
    isAuthorizedCommander = true;
    isOwnerOrHigher = true;
  }

  const checkServer = needsLiveGameServerCheck(userMessage);

  // Intelligent Live Web & YouTube/Docs Research
  let webContext = null;
  if (needsLiveWebSearch(userMessage)) {
    const isVideo = /\b(youtube|yt\b|video|song|music|playlist)\b/i.test(userMessage);
    const webRes = await searchLiveWeb(userMessage, isVideo);
    if (webRes.success && webRes.summary) {
      webContext = webRes.summary;
    }
  }

  // Authentic Minecraft Recipe Grounding
  const matchedRecipe = findRecipeInfo(userMessage);
  let recipeContext = null;
  if (matchedRecipe) {
    recipeContext = `=== AUTHENTIC MINECRAFT RECIPE GROUNDING (MUST FOLLOW 100%) ===
Item: ${matchedRecipe.name}
Exact Ingredients: ${matchedRecipe.ingredients}
Nepali Guide: ${matchedRecipe.guideNepali}
ASCII Visual 3x3 Grid:
${matchedRecipe.layout}
CRITICAL: DO NOT HALLUCINATE NETHERITE OR ANY WRONG INGREDIENT. Explain concisely in Nepali and output [[IMAGE:${matchedRecipe.key}]]. Include the visual 3x3 layout!`;
  }

  const systemInstruction = buildUnifiedSystemPrompt({
    guild,
    guildId,
    channelId,
    channelName,
    guild,
    guildId,
    channelId,
    channelName,
    userName,
    userId,
    userRoles,
    isOwnerOrHigher,
    isOwner,
    isRespected,
    isAuthorizedCommander,
    includeServerStatus: checkServer,
    webContext,
    recipeContext,
  });

  const historyMessages = getChatHistory(channelId);
  const formattedUserPrompt = `[${userName}]: ${userMessage}`;

  const providers = [callGeminiAPI, callGroqAPI];
  for (const callProvider of providers) {
    try {
      const result = await callProvider(systemInstruction, historyMessages, formattedUserPrompt);
      const parsed = parseTags(result.text);

      if (parsed.action && !isAuthorizedCommander) {
        parsed.action = null;
        parsed.params = {};
      }

      // Resolve Recipe Image URL and attach visual 3x3 layout if requested
      let imageUrl = null;
      if (matchedRecipe) {
        imageUrl = matchedRecipe.imageUrl || (await findRecipeImageUrl(matchedRecipe.key));
        if (!parsed.cleanText.includes('┌───┬───┬───┐')) {
          parsed.cleanText = `${parsed.cleanText}\n\n${matchedRecipe.layout}`;
        }
      } else {
        const queryToSearch = parsed.imageQuery || (/\b(recipe|craft|crafting|banaune|picture|photo|pic)\b/i.test(userMessage) ? userMessage : null);
        if (queryToSearch) {
          imageUrl = await findRecipeImageUrl(queryToSearch);
        }
      }

      if (saveToHistory) {
        appendChatTurn(channelId, userName, userMessage, parsed.cleanText);
      }

      // Autonomous dynamic roast learning: if the bot generated a roast, persist it so vocabulary keeps evolving
      if (/\b(roast|gali|trash\s*talk|shred|dhulai)\b/i.test(userMessage) ||
          /(?:clown|totem pop|radi ko choro|w-tap|aim|kando|b\*\*te|jatha|mji)/i.test(parsed.cleanText)) {
        recordLearnedRoast(parsed.cleanText);
      }

      return {
        text: parsed.cleanText,
        action: parsed.action,
        params: parsed.params,
        imageUrl,
        provider: result.provider,
      };
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.warn(`[AIEngine] ${callProvider.name} failed: ${errMsg}`);
    }
  }

  const fallbackText = await generateOfflineFallbackReply({
    guild,
    userMessage,
    userName,
    userRoles,
    isOwnerOrHigher,
    isOwner,
    isRespected,
    isAuthorizedCommander,
    webContext,
  });
  const fallbackParsed = parseTags(fallbackText);
  let fallbackImg = null;
  if (matchedRecipe) {
    fallbackImg = matchedRecipe.imageUrl || (await findRecipeImageUrl(matchedRecipe.key));
  } else if (fallbackParsed.imageQuery || /\b(stick|craft)\b/i.test(userMessage)) {
    fallbackImg = await findRecipeImageUrl(fallbackParsed.imageQuery || userMessage);
  }

  return {
    text: fallbackParsed.cleanText,
    action: fallbackParsed.action,
    params: fallbackParsed.params,
    imageUrl: fallbackImg,
    provider: 'Local Fallback',
  };
}

async function generateCatchupSummary({
  guildId,
  channelId,
  channelName,
  messagesToSummarize = [],
  userName = 'Player',
  isOwnerOrHigher = false,
}) {
  const chatTranscript = messagesToSummarize.length > 0
    ? messagesToSummarize.map((m) => `[${m.timestamp}] ${m.authorName}: ${m.content}`).join('\n')
    : 'No recent messages.';

  const prompt = `Give a 2-sentence quick summary of what happened in #${channelName}:
${chatTranscript}`;

  return generateAIResponse({
    guildId,
    channelId,
    channelName,
    userName,
    isOwnerOrHigher,
    userMessage: prompt,
    saveToHistory: false,
  });
}

function shouldAmbientChimeIn(content = '') {
  const clean = content.trim();
  if (clean.length < 5 || clean.length > 350) return false;
  if (/^[!/?.~#]/.test(clean)) return false;

  const lower = clean.toLowerCase();
  // Only chime in if explicitly asking about the server status or asking the bot to catch them up
  const explicitTriggers = [
    /\b(what did i miss|catch me up|k k bhayo server ma)\b/i,
    /\b(is the server (?:up|down|online|offline|working)|server ip k ho|server status kasto cha)\b/i,
    /\b(novabot sun na|oi novabot|hey novabot)\b/i,
  ];

  return explicitTriggers.some((rx) => rx.test(lower));
}

module.exports = {
  generateAIResponse,
  generateCatchupSummary,
  shouldAmbientChimeIn,
  needsLiveGameServerCheck,
  needsLiveWebSearch,
  getMemberHierarchyTier,
  buildUnifiedSystemPrompt,
};
