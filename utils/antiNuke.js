const { PermissionsBitField } = require('discord.js');
const { isHigherRoleOrOwner } = require('./discordActions');

// Rolling tracking stores
const messageHistory = new Map(); // userId -> Array<{ timestamp, content }>
const joinHistory = new Map(); // guildId -> Array<timestamps>

// Calibration: High thresholds to prevent false positives on regular chatter
const SPAM_WINDOW_MS = 3000;
const SPAM_RAPID_FLOOD_LIMIT = 10; // 10+ rapid messages in 3s (real bot flood)
const SPAM_DUPLICATE_LIMIT = 6;    // 6+ identical messages in 3s (repeat nuke)
const MASS_MENTION_LIMIT = 8;      // 8+ user/role pings in a single message
const RAID_JOIN_WINDOW_MS = 5000;
const RAID_JOIN_THRESHOLD = 8;     // 8+ accounts joining in 5s

/**
 * Checks if a message represents a genuine, serious server attack or security threat.
 * Ignores regular conversation, clan banter, and normal Discord invite sharing.
 */
function checkMessageSpam(message) {
  if (!message.guild || message.author.bot) return { isSpam: false };

  const member = message.member;
  if (!member) return { isSpam: false };

  // 1. Whitelist Server Owner, Admins, and Staff completely
  const isOwner = Boolean(message.guild.ownerId && member.id && member.id === message.guild.ownerId);
  const isAdmin = Boolean(member.permissions?.has && member.permissions.has(PermissionsBitField.Flags.Administrator));
  const isMod = Boolean(member.permissions?.has && member.permissions.has(PermissionsBitField.Flags.ManageMessages));

  if (isOwner || isHigherRoleOrOwner(member) || isAdmin || isMod) {
    return { isSpam: false };
  }

  const now = Date.now();
  const userId = message.author.id;
  const content = (message.content || '').trim();

  // 2. Severe Malicious Phishing & Token Stealer Links (Real Threats Only)
  // Normal discord.gg clan invites are NOT blocked
  const phishingPattern = /(?:free-nitro|steamcommunity-nitro|discord-gift\.ru|discrod-nitro|nitro-drop|gift-discord|steam-nitro|dlscord\.gg|nitro-gift)/i;
  if (phishingPattern.test(content)) {
    return {
      isSpam: true,
      reason: 'Malicious phishing or credential stealer link',
      action: 'delete_and_timeout',
      severity: 'high',
    };
  }

  // 3. Unauthorized Mass Ping Attacks
  const hasEveryone = content.includes('@everyone') || content.includes('@here');
  if (hasEveryone && !member.permissions?.has(PermissionsBitField.Flags.MentionEveryone)) {
    return {
      isSpam: true,
      reason: 'Unauthorized @everyone broadcast',
      action: 'delete_and_warn',
      severity: 'medium',
    };
  }

  const mentionCount = (message.mentions.users?.size || 0) + (message.mentions.roles?.size || 0);
  if (mentionCount >= MASS_MENTION_LIMIT) {
    return {
      isSpam: true,
      reason: `Mass ping attack (${mentionCount} mentions)`,
      action: 'delete_and_timeout',
      severity: 'high',
    };
  }

  // 4. Automated Bot Flooding & Exact Duplicate Spam
  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }
  const history = messageHistory.get(userId);
  history.push({ timestamp: now, content });

  // Evict timestamps older than window
  while (history.length > 0 && history[0].timestamp < now - SPAM_WINDOW_MS) {
    history.shift();
  }

  // Check identical repeat copies
  const duplicates = history.filter((h) => h.content.length > 2 && h.content === content).length;
  if (duplicates >= SPAM_DUPLICATE_LIMIT) {
    return {
      isSpam: true,
      reason: `Automated repeated message flood (${duplicates} duplicates)`,
      action: 'delete_and_timeout',
      severity: 'high',
    };
  }

  // Check extreme rapid spam (10+ messages in 3 seconds)
  if (history.length >= SPAM_RAPID_FLOOD_LIMIT) {
    return {
      isSpam: true,
      reason: `Extreme message flood (${history.length} messages in ${SPAM_WINDOW_MS / 1000}s)`,
      action: 'delete_and_timeout',
      severity: 'high',
    };
  }

  return { isSpam: false };
}

/**
 * Handles confirmed spam or attack violation with calibrated response
 */
async function handleSpamViolation(message, violation) {
  try {
    const reason = typeof violation === 'string' ? violation : (violation.reason || 'Spam attack');
    const severity = violation.severity || 'high';

    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const member = message.member;
    // Only timeout on confirmed high-severity attacks (phishing, mass mention raid, bot flood)
    if (severity === 'high' && member && member.moderatable) {
      await member.timeout(5 * 60 * 1000, `Nova Anti-Nuke: ${reason}`).catch(() => {});
    }

    const alertMsg = await message.channel.send(
      `🛡️ **[Nova Security Shield]**: Neutralized threat from ${message.author} (${reason})`
    );
    setTimeout(() => alertMsg.delete().catch(() => {}), 6000);
  } catch (err) {
    console.error('[AntiNuke] Error handling spam:', err.message);
  }
}

/**
 * Detects coordinated bot account mass-joins
 */
function checkRaidJoin(guildMember) {
  const guildId = guildMember.guild.id;
  const now = Date.now();

  if (!joinHistory.has(guildId)) {
    joinHistory.set(guildId, []);
  }
  const timestamps = joinHistory.get(guildId);
  timestamps.push(now);

  while (timestamps.length > 0 && timestamps[0] < now - RAID_JOIN_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= RAID_JOIN_THRESHOLD) {
    return {
      isRaid: true,
      count: timestamps.length,
      reason: `Mass account raid join detected (${timestamps.length} joins in ${RAID_JOIN_WINDOW_MS / 1000}s)`,
    };
  }

  return { isRaid: false };
}

module.exports = {
  checkMessageSpam,
  handleSpamViolation,
  checkRaidJoin,
};
