const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  config: path.join(DATA_DIR, 'config.json'),
  knowledge: path.join(DATA_DIR, 'knowledge.json'),
  events: path.join(DATA_DIR, 'events.json'),
  users: path.join(DATA_DIR, 'users.json'),
};

function loadJson(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[ContextManager] Error loading ${path.basename(filePath)}:`, err.message);
  }
  return defaultData;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[ContextManager] Error saving ${path.basename(filePath)}:`, err.message);
  }
}

// Persistent state
const guildConfigs = loadJson(FILES.config, {});
const knowledgeBase = loadJson(FILES.knowledge, {});
const serverEvents = loadJson(FILES.events, {});
const userMemories = loadJson(FILES.users, {});

// In-memory rolling buffers
const channelMessageLogs = new Map();
const aiChatHistories = new Map();
const ambientCooldowns = new Map();

const MAX_CHANNEL_LOG = 30;
const MAX_CHAT_HISTORY = 8;

function getGuildConfig(guildId = 'default') {
  if (!guildConfigs[guildId]) {
    guildConfigs[guildId] = {
      botName: process.env.BOT_NAME || 'NovaBot',
      languageMode: 'auto', // auto | english | nepali | roman_nepali
      aiChannels: [], // Channel IDs where bot replies to EVERY message automatically
      authorizedCommanders: [], // User IDs explicitly authorized by Owner to command bot actions
      ambientEnabled: process.env.AMBIENT_ENABLED === 'true', // Default false to prevent uninvited chat interruptions
      ambientCooldownSec: parseInt(process.env.AMBIENT_COOLDOWN_SECONDS || '60', 10),
      teamName: 'Nova',
      gameServers: process.env.DEFAULT_MC_HOST
        ? [
            {
              name: process.env.DEFAULT_SERVER_NAME || 'Nova SMP / Practice',
              host: process.env.DEFAULT_MC_HOST,
              port: parseInt(process.env.DEFAULT_MC_PORT || '25565', 10),
            },
          ]
        : [],
    };
    saveJson(FILES.config, guildConfigs);
  }
  if (!guildConfigs[guildId].authorizedCommanders) {
    guildConfigs[guildId].authorizedCommanders = [];
    saveJson(FILES.config, guildConfigs);
  }
  if (!guildConfigs[guildId].respectedUsers) {
    guildConfigs[guildId].respectedUsers = [];
    saveJson(FILES.config, guildConfigs);
  }
  // Ensure botName is updated if previously defaulted to Sathi
  if (guildConfigs[guildId].botName === 'Sathi') {
    guildConfigs[guildId].botName = 'NovaBot';
    saveJson(FILES.config, guildConfigs);
  }
  return guildConfigs[guildId];
}

function isUserAuthorized(guildId, userId, isOwnerOrPrivileged = false) {
  if (isOwnerOrPrivileged) return true;
  if (isRespectedUser(guildId, userId)) return true;
  const cfg = getGuildConfig(guildId);
  return (cfg.authorizedCommanders || []).includes(userId);
}

function addAuthorizedCommander(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  if (!cfg.authorizedCommanders.includes(userId)) {
    cfg.authorizedCommanders.push(userId);
    saveJson(FILES.config, guildConfigs);
  }
  return cfg.authorizedCommanders;
}

function removeAuthorizedCommander(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  cfg.authorizedCommanders = (cfg.authorizedCommanders || []).filter((id) => id !== userId);
  saveJson(FILES.config, guildConfigs);
  return cfg.authorizedCommanders;
}

// Owner-Granted Respect & VIP System (Bot treats these users with Owner-level reverence & commands)
function getRespectedUsers(guildId = 'default') {
  const cfg = getGuildConfig(guildId);
  return cfg.respectedUsers || [];
}

function isRespectedUser(guildId, userId) {
  if (!userId) return false;
  const cfg = getGuildConfig(guildId);
  return (cfg.respectedUsers || []).some((u) => u.userId === userId || u.id === userId);
}

function addRespectedUser(guildId, userId, username = '', grantedBy = 'Owner') {
  const cfg = getGuildConfig(guildId);
  if (!cfg.respectedUsers) cfg.respectedUsers = [];

  const existingIdx = cfg.respectedUsers.findIndex((u) => u.userId === userId || u.id === userId);
  const entry = {
    userId,
    username: username || `User_${userId}`,
    grantedBy,
    grantedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    cfg.respectedUsers[existingIdx] = entry;
  } else {
    cfg.respectedUsers.push(entry);
  }

  // Respected users are also automatically authorized commanders
  if (!cfg.authorizedCommanders) cfg.authorizedCommanders = [];
  if (!cfg.authorizedCommanders.includes(userId)) {
    cfg.authorizedCommanders.push(userId);
  }

  saveJson(FILES.config, guildConfigs);
  return entry;
}

function removeRespectedUser(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  if (cfg.respectedUsers) {
    cfg.respectedUsers = cfg.respectedUsers.filter((u) => u.userId !== userId && u.id !== userId);
  }
  saveJson(FILES.config, guildConfigs);
  return cfg.respectedUsers || [];
}

function updateGuildConfig(guildId, updater) {
  const cfg = getGuildConfig(guildId);
  updater(cfg);
  guildConfigs[guildId] = cfg;
  saveJson(FILES.config, guildConfigs);
  return cfg;
}

// Knowledge Base management
function getKnowledge(guildId = 'default') {
  if (!knowledgeBase[guildId]) {
    knowledgeBase[guildId] = [
      {
        id: 'team_nova_recruitment',
        topic: 'How to Join Team Nova (Recruitment & Tryouts)',
        fact: 'To join Team Nova, players must meet these official requirements: 1. Nationality: Nepali players only. 2. Communication: Working microphone and active on VC (Discord). 3. Activity: Daily active players. 4. Grinders & Builders (passionate resource gatherers). 5. PvP Skills: Strong 1.8 / 1.9+ combat mechanics. 6. Experience: Solid survival/faction/SMP background. To apply, players must open a ticket in #📜|tickets!',
        addedBy: 'Melloww',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'team_nova_custom_plugin',
        topic: 'Team Nova Custom Powers Plugin (By Mighty G)',
        fact: 'Mighty G announced that Team Nova is developing its own official custom Minecraft plugin featuring custom powers, items, and abilities (like lifesteal, strength, infuse, bliss, etc.)! Players can suggest new powers, abilities, or items in the #📜|suggestion-power-plugins channel.',
        addedBy: 'Mighty G',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'team_nova_core',
        topic: 'Team Nova Identity & Leadership',
        fact: 'Team Nova is the elite Nepali Minecraft squad of top-tier PvP gods, grinders, and builders led by Mighty G and leadership. Owners and higher roles are deeply respected.',
        addedBy: 'System',
        updatedAt: new Date().toISOString(),
      },
    ];
    saveJson(FILES.knowledge, knowledgeBase);
  }
  return knowledgeBase[guildId];
}

function addKnowledge(guildId, topic, fact, addedBy = 'Admin') {
  const list = getKnowledge(guildId);
  const existingIdx = list.findIndex((item) => item.topic.toLowerCase() === topic.toLowerCase());
  const entry = {
    id: `kb_${Date.now().toString(36)}`,
    topic: topic.trim(),
    fact: fact.trim(),
    addedBy,
    updatedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    entry.id = list[existingIdx].id;
    list[existingIdx] = entry;
  } else {
    list.push(entry);
  }
  saveJson(FILES.knowledge, knowledgeBase);
  return entry;
}

function removeKnowledge(guildId, query) {
  const list = getKnowledge(guildId);
  const q = query.toLowerCase().trim();
  const idx = list.findIndex(
    (item) => item.id.toLowerCase() === q || item.topic.toLowerCase().includes(q)
  );
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  saveJson(FILES.knowledge, knowledgeBase);
  return removed;
}

// Server Events
function getEvents(guildId = 'default') {
  if (!serverEvents[guildId]) {
    serverEvents[guildId] = [];
  }
  return serverEvents[guildId];
}

function addEvent(guildId, title, details, addedBy = 'Admin') {
  const list = getEvents(guildId);
  const ev = {
    id: `ev_${Date.now().toString(36)}`,
    title: title.trim(),
    details: details.trim(),
    addedBy,
    createdAt: new Date().toISOString(),
  };
  list.unshift(ev);
  if (list.length > 20) list.pop();
  saveJson(FILES.events, serverEvents);
  return ev;
}

function removeEvent(guildId, query) {
  const list = getEvents(guildId);
  const q = query.toLowerCase().trim();
  const idx = list.findIndex(
    (item) => item.id.toLowerCase() === q || item.title.toLowerCase().includes(q)
  );
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  saveJson(FILES.events, serverEvents);
  return removed;
}

function clearEvents(guildId) {
  serverEvents[guildId] = [];
  saveJson(FILES.events, serverEvents);
}

// Rolling Channel Message Log
function recordChannelMessage(message) {
  if (!message.channelId || !message.content) return;
  const channelId = message.channelId;
  if (!channelMessageLogs.has(channelId)) {
    channelMessageLogs.set(channelId, []);
  }
  const logs = channelMessageLogs.get(channelId);
  logs.push({
    authorId: message.author?.id || 'unknown',
    authorName: message.member?.displayName || message.author?.username || 'User',
    roles: message.member?.roles?.cache ? Array.from(message.member.roles.cache.values()).map((r) => r.name) : [],
    content: message.content.slice(0, 500),
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    isBot: Boolean(message.author?.bot),
  });
  if (logs.length > MAX_CHANNEL_LOG) {
    logs.shift();
  }

  // Track user interactions
  if (message.author && !message.author.bot) {
    const uid = message.author.id;
    if (!userMemories[uid]) {
      userMemories[uid] = {
        username: message.author.username,
        displayName: message.member?.displayName || message.author.username,
        messageCount: 0,
        lastSeen: null,
        lastChannel: null,
      };
    }
    userMemories[uid].displayName = message.member?.displayName || message.author.username;
    userMemories[uid].messageCount = (userMemories[uid].messageCount || 0) + 1;
    userMemories[uid].lastSeen = new Date().toISOString();
    userMemories[uid].lastChannel = message.channel?.name || message.channelId;
  }
}

function getRecentChannelMessages(channelId, limit = 25) {
  const logs = channelMessageLogs.get(channelId) || [];
  return logs.slice(-limit);
}

// Multi-turn AI conversation history
function appendChatTurn(channelId, userAuthor, userText, botReply) {
  if (!aiChatHistories.has(channelId)) {
    aiChatHistories.set(channelId, []);
  }
  const hist = aiChatHistories.get(channelId);
  hist.push({
    role: 'user',
    author: userAuthor,
    content: userText.slice(0, 600),
  });
  hist.push({
    role: 'assistant',
    content: botReply.slice(0, 1000),
  });
  while (hist.length > MAX_CHAT_HISTORY) {
    hist.shift();
  }
}

function getChatHistory(channelId) {
  return aiChatHistories.get(channelId) || [];
}

function clearChatHistory(channelId) {
  aiChatHistories.delete(channelId);
}

function canTriggerAmbient(channelId, cooldownSec = 60) {
  const last = ambientCooldowns.get(channelId) || 0;
  return Date.now() - last >= cooldownSec * 1000;
}

function markAmbientTriggered(channelId) {
  ambientCooldowns.set(channelId, Date.now());
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
  isUserAuthorized,
  addAuthorizedCommander,
  removeAuthorizedCommander,
  getRespectedUsers,
  isRespectedUser,
  addRespectedUser,
  removeRespectedUser,
  getKnowledge,
  addKnowledge,
  removeKnowledge,
  getEvents,
  addEvent,
  removeEvent,
  clearEvents,
  recordChannelMessage,
  getRecentChannelMessages,
  appendChatTurn,
  getChatHistory,
  clearChatHistory,
  canTriggerAmbient,
  markAmbientTriggered,
};
