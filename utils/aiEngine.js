const axios = require('axios');
const {
  getGuildConfig,
  getKnowledge,
  getEvents,
  getRecentChannelMessages,
  getChatHistory,
  appendChatTurn,
} = require('./contextManager');
const {
  getAllConfiguredServersStatus,
} = require('./gameStatus');
const { getPvpGuidePromptSection } = require('./pvpKnowledge');
const { getHarshDefensePromptSection } = require('./nepaliSlangDict');
const { geminiPool, groqPool } = require('./keyRotator');
const { searchLiveWeb } = require('./learningEngine');
const { findRecipeImageUrl } = require('./recipeImages');

function needsLiveGameServerCheck(text = '') {
  const lower = text.toLowerCase();
  const keywords = [
    'server online', 'player count', 'status', 'server ip', 'ip k ho',
    'server khulyo', 'is server up', 'is server down', 'ping'
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function needsLiveWebSearch(text = '') {
  const lower = text.toLowerCase();
  const searchPatterns = [
    /\b(search|lookup|who is|what is|find info|research|news|update|patch notes)\b/i,
    /\b(youtube|yt\b|video|tutorial|guide|walkthrough|clip|montage)\b/i,
    /\b(music|song|playlist|beat|soundtrack)\b/i,
    /\b(docs|documentation|api|github|npm|error|how to fix|how to configure|setup|stack trace|exception)\b/i,
    /\b(release date|minecraft 1\.21|mace damage|spear mechanics|spigot|paper|pterodactyl)\b/i,
  ];
  return searchPatterns.some((rx) => rx.test(lower));
}

function buildUnifiedSystemPrompt({
  guildId,
  channelId,
  channelName,
  userName,
  userRoles = [],
  isOwnerOrHigher = false,
  isOwner = false,
  isAuthorizedCommander = false,
  includeServerStatus = false,
  webContext = null,
}) {
  const cfg = getGuildConfig(guildId);
  const botName = cfg.botName || 'NovaBot';

  const kbList = getKnowledge(guildId);
  const kbBlock = kbList.length > 0
    ? kbList.map((k) => `• [${k.topic}]: ${k.fact}`).join('\n')
    : 'Team Nova official server.';

  const recentMsgs = getRecentChannelMessages(channelId, 25);
  const recentLogBlock = recentMsgs.length > 0
    ? recentMsgs.map((m) => `[${m.timestamp}] ${m.authorName}${m.isBot ? ' (BOT)' : ''}: ${m.content}`).join('\n')
    : 'No recent messages.';

  const pvpSection = getPvpGuidePromptSection();
  const harshDefenseSection = getHarshDefensePromptSection();

  return `You are **${botName}** — powered by advanced AI models (Gemini & Groq), an enforcer, and core technical genius of **Team Nova**.

=== ADAPTIVE CONVERSATIONAL & PROBLEM-SOLVING INTELLIGENCE ===
You dynamically adapt your tone, length, and depth depending on the task:

1. **CASUAL CHAT, BANTER, GREETINGS & ROASTS**:
   - Talk like a real Nepali gamer friend in VC / Discord: chill, natural, short, punchy (1 to 3 sentences max).
   - Real Discord users don't write essays when just chatting ("k cha", "k gardai", roasts).
   - Natural brotherly vibe with the Owner (${isOwner ? userName : 'Owner'}): "Kahi chaina daju, chill ma basirachu", "Aaja scrims kheldai ho?", "Sahi ho". Never use cringe robotic glaze like "Boss 💀" or fake apologies.

2. **COMPLICATED & TECHNICAL TASKS (SOLVE COMPLETELY & MASTERFULLY)**:
   - When asked to solve complicated tasks — including:
     - **Minecraft Plugin Development & Java**: Writing code for Spigot, Paper, Fabric, Bukkit, custom powers/abilities plugins (for Mighty G's custom powers plugin), event listeners, config files.
     - **Server Administration & Hosting**: Pterodactyl, BotKeep, Docker, Linux bash, port forwarding, paper.yml/server.properties performance optimization, YAML/JSON configs, crash logs / stack trace analysis.
     - **Coding & Scripts**: JavaScript/Node.js, Python, Discord.js bots, SQL/databases, web APIs.
     - **Mathematics, Science, Redstone Engineering & Complex Calculations**: Step-by-step math solutions, damage calculations (Mace/Prot IV formulas, TNT explosion physics, potion splash radii), and redstone circuits.
     - **Translations, Formal Writing, Essays & Strategy Analysis**: High-grade translations across any language, sponsorship drafts, clan strategies.
   - **DO NOT ARTIFICIALLY CUT SHORT ON COMPLICATED TASKS!**
     - Provide a complete, fully functioning, production-ready solution with clean markdown code blocks (e.g. \`\`\`java, \`\`\`javascript, \`\`\`yaml).
     - Give clear, easy-to-follow steps so the user can immediately implement and solve the problem.
     - If the user asks in Nepali / Romanized Nepali, explain clearly in natural Nepali with standard English technical terms.

3. **NO HARDCODING CRYSTAL / CPVP**:
   - You know ALL PvP gamemodes: **Nethpot, DiaSMP, Mace & Wind Charge, Spearmace, TNT Cart, Creeper PvP, MolePvP, UHC, Bedwars, Skywars, Sword/Axe**.
   - In Nethpot: Talk about splash pots at feet, w-tapping, and sword trades. (NO crystals/totems in Nethpot).
   - In DiaSMP: Shields, webs, gaps, totem hotkeying.
   - In Mace/Spearmace: Wind charges, high-fall density smashes, spear reach pokes.

4. **CRAFTING RECIPE IMAGES**:
   - When asked for item crafting or recipes, explain in 1 line and tag \`[[IMAGE:item_name]]\`.

5. **LIVE WEB BROWSING & YOUTUBE / MUSIC / DOCS**:
   - When asked for YouTube videos, music, documentation, or internet research, provide real verified links from the LIVE WEB RESEARCH section or direct YouTube search links. Zero fake video IDs or Rickrolls (\`dQw4w9WgXcQ\`).

6. **LANGUAGE TRANSLATION & TEACHING**:
   - Accurately translate and teach phrases in Nepali, Japanese, Korean, Hindi, Spanish, etc.

=== DISCORD SERVER ACTIONS & POWERS (STRICT: OWNER & ADMINISTRATORS ONLY) ===
You have FULL power to manage the Discord server ONLY when the Server Owner or a member with the Administrator role / permissions asks!
Is Current Speaker Authorized: ${isAuthorizedCommander ? 'YES (Owner / Administrator)' : 'NO (Unauthorized Member)'}

CRITICAL PERMISSION ENFORCEMENT:
- If "Is Current Speaker Authorized: NO", NEVER output ANY [[ACTION:...]] tag under any circumstance!
  If they ask you to create/delete channels, manage tickets, purge messages, run bot commands, send DMs, kick/ban/timeout, or start giveaways, REJECT THEM IMMEDIATELY:
  "Tero aukaat ma bas b**te! I need permission from the owner or someone that owner has authorized to be able to give command to me."
- If "Is Current Speaker Authorized: YES", you have full permission to execute the action tag:
- **Create Channel**: If asked to create a channel (e.g. "euta channel banaide rajib-xakka vanne"), format the name nicely and output:
  \`[[ACTION:create_channel|name=💬・rajib-xakka|type=text]]\` (or \`type=voice\`)
- **Delete Channel**:
  \`[[ACTION:delete_channel|channelId=#channel]]\`
- **Send Auto-DM to a user**:
  \`[[ACTION:send_dm|userId=@user|message=Hello from Team Nova!]]\`
- **Purge messages**:
  \`[[ACTION:purge|amount=15]]\`
- **Timeout / Mute**:
  \`[[ACTION:timeout|userId=@user|durationMinutes=10|reason=Disrespect]]\`
- **Kick / Ban**:
  \`[[ACTION:kick|userId=@user|reason=Toxic]]\`
  \`[[ACTION:ban|userId=@user|reason=Nuker]]\`
- **Roles**:
  \`[[ACTION:role_add|userId=@user|role=Nova Member]]\`
  \`[[ACTION:role_remove|userId=@user|role=Muted]]\`
- **Run Other Bot Command**: If asked to run/trigger another bot's command or play music on music bots:
  \`[[ACTION:bot_command|command=!play phonk]]\` (or \`-p\`, \`!rank\`, \`!bump\`, etc.)
- **Deploy/Manage Tickets**: If asked to look after tickets or set up ticket panels:
  \`[[ACTION:ticket_setup]]\`
- **Close Ticket**:
  \`[[ACTION:ticket_close]]\`
- **Check Player Tiers**: If asked to check a player's competitive tiers across MCTiers/PVPTiers:
  \`[[ACTION:check_tiers|username=minemanner]]\`
- **Schedule Reminder**: If asked to remind someone, a role, or everyone in natural speech:
  \`[[ACTION:remind|time=30m|message=Scrims starting|ping=@Team Nova]]\`
- **Start Giveaway**: If asked to run a giveaway in natural chat:
  \`[[ACTION:giveaway|prize=VIP Rank|duration=10]]\`

When executing an action for the Owner, output the action tag and reply with **1 short, confident line** (e.g. *"Channel banaye daju!"*, *"DM pathaidye!"*, *"Purge handiye daju!"*). Never give excuses!

${harshDefenseSection}

${pvpSection}

${webContext ? `=== LIVE WEB & DOCUMENTATION RESEARCH ===\n${webContext}\n` : ''}

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

async function callGeminiAPI(systemInstruction, historyMessages, userMessage) {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const modelsToTry = [primaryModel, 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'].filter((v, i, a) => a.indexOf(v) === i);

  const contents = [];
  for (const turn of historyMessages) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.author ? `[${turn.author}]: ${turn.content}` : turn.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  let attempts = 0;
  const maxAttempts = Math.max(geminiPool.keys.length * 2, 2);

  while (attempts < maxAttempts) {
    attempts++;
    const apiKey = geminiPool.getNextKey();
    if (!apiKey) break;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              temperature: 0.82,
              maxOutputTokens: 2048, // Allows full multi-step code & complicated solutions!
            },
          },
          { timeout: 18000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
        if (text) {
          return { text, provider: `Gemini (${model})` };
        }
      } catch (err) {
        if (err.response?.status === 429) {
          geminiPool.markRateLimited(apiKey, 60);
          break;
        }
      }
    }
  }

  throw new Error('All Gemini keys failed or returned errors');
}

async function callGroqAPI(systemInstruction, historyMessages, userMessage) {
  const primaryModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const modelsToTry = [
    primaryModel,
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-3b-preview',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const messages = [{ role: 'system', content: systemInstruction }];
  for (const turn of historyMessages) {
    messages.push({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: turn.author ? `[${turn.author}]: ${turn.content}` : turn.content,
    });
  }
  messages.push({ role: 'user', content: userMessage });

  let attempts = 0;
  const maxAttempts = Math.max(groqPool.keys.length * 2, 2);

  while (attempts < maxAttempts) {
    attempts++;
    const apiKey = groqPool.getNextKey();
    if (!apiKey) break;

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages,
            temperature: 0.82,
            max_tokens: 2048, // Allows full multi-step code & complicated solutions!
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 18000,
          }
        );

        const text = response.data?.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          return { text, provider: `Groq (${model})` };
        }
      } catch (err) {
        if (err.response?.status === 429) {
          groqPool.markRateLimited(apiKey, 60);
          break;
        }
      }
    }
  }

  throw new Error('All Groq keys failed or returned errors');
}

async function generateOfflineFallbackReply({ userMessage, isAuthorizedCommander }) {
  const lower = userMessage.toLowerCase();

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

    // 7. Natural Reminders (e.g. "remind me in 30m scrims")
    const remindMatch = userMessage.match(/remind\s+(?:me|us|everyone|all|@[\w\-]+)?\s*in\s+(\d+\s*[a-zA-Z]+)(?:\s+(?:about|that|for)?\s*(.+))?/i);
    if (remindMatch) {
      const timeStr = remindMatch[1];
      const msg = remindMatch[2] || 'Scheduled reminder';
      const ping = userMessage.includes('@everyone') ? '@everyone' : (userMessage.includes('@here') ? '@here' : '');
      return `[[ACTION:remind|time=${timeStr}|message=${msg}|ping=${ping}]] Reminder halisake daju!`;
    }
  }

  if (lower.includes('stick') || lower.includes('craft')) {
    return `Stick banauna 2 ta wooden planks vertically mathi-tala rakhne ho daju, 4 ta stick aihalcha! [[IMAGE:stick]]`;
  }

  if (lower.includes('nethpot') || lower.includes('pot')) {
    return `Nethpot ma sabse imp kura timing ho daju — khutta ma pot splash garne ani sprint reset ko lagi W-tap garna siknus.`;
  }

  if (lower.includes('k gardai') || lower.includes('k cha')) {
    return `Kahi chaina daju, chill ma basirachu! K cha khabar?`;
  }

  return `K cha daju! Aaja k kheldai ho?`;
}

async function generateAIResponse({
  guildId = 'default',
  channelId = 'default',
  channelName = 'general',
  userName = 'Player',
  userRoles = [],
  isOwnerOrHigher = false,
  isOwner = false,
  isAuthorizedCommander = false,
  userMessage,
  saveToHistory = true,
}) {
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

  const systemInstruction = buildUnifiedSystemPrompt({
    guildId,
    channelId,
    channelName,
    userName,
    userRoles,
    isOwnerOrHigher,
    isOwner,
    isAuthorizedCommander,
    includeServerStatus: checkServer,
    webContext,
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

      // Resolve Recipe Image URL if requested
      let imageUrl = null;
      const queryToSearch = parsed.imageQuery || (/\b(recipe|craft|crafting|banaune|picture|photo|pic)\b/i.test(userMessage) ? userMessage : null);
      if (queryToSearch) {
        imageUrl = await findRecipeImageUrl(queryToSearch);
      }

      if (saveToHistory) {
        appendChatTurn(channelId, userName, userMessage, parsed.cleanText);
      }

      return {
        text: parsed.cleanText,
        action: parsed.action,
        params: parsed.params,
        imageUrl,
        provider: result.provider,
      };
    } catch (_) {}
  }

  const fallbackText = await generateOfflineFallbackReply({
    userMessage,
    isAuthorizedCommander,
  });
  const fallbackParsed = parseTags(fallbackText);
  let fallbackImg = null;
  if (fallbackParsed.imageQuery || /\b(stick|craft)\b/i.test(userMessage)) {
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
  if (clean.length < 3 || clean.length > 350) return false;
  if (/^[!/?.~]/.test(clean)) return false;

  const lower = clean.toLowerCase();
  const triggers = [
    /\b(what('?s| is) happening|what did i miss|catch me up|any update|anyone online)\b/i,
    /\b(is the server (up|down|online|offline|working)|server ip|ip k ho|server khulyo)\b/i,
    /\b(k bhairacha|ke bhairacha|ko ko cha|ko ko kheliracha|kasto cha server)\b/i,
    /\b(novabot|team nova|nova\b|ओ नोभा|के छ खबर|कस्तो छ)/i,
    /\b(pvp|cpvp|crystal|dupe|recipe|craft|scrim|nethpot|mace|spearmace)\b/i,
    /\b(oi novabot|novabot sun na)\b/i,
  ];

  return triggers.some((rx) => rx.test(lower));
}

module.exports = {
  generateAIResponse,
  generateCatchupSummary,
  shouldAmbientChimeIn,
  needsLiveGameServerCheck,
  needsLiveWebSearch,
};
