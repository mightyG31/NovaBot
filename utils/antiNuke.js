const { PermissionsBitField } = require('discord.js');
const { isHigherRoleOrOwner } = require('./discordActions');

// Rolling tracking stores
const messageHistory = new Map(); // userId -> Array<timestamps>
const joinHistory = new Map(); // guildId -> Array<timestamps>

const SPAM_WINDOW_MS = 3500;
const SPAM_MAX_MESSAGES = 5;
const MASS_MENTION_LIMIT = 4;
const RAID_JOIN_WINDOW_MS = 5000;
const RAID_JOIN_THRESHOLD = 6;

function checkMessageSpam(message) {
  if (!message.guild || message.author.bot) return { isSpam: false };

  const member = message.member;
  if (isHigherRoleOrOwner(member)) return { isSpam: false };

  const now = Date.now();
  const userId = message.author.id;

  // 1. Mass Mention Check
  const mentionCount = (message.mentions.users?.size || 0) + (message.mentions.roles?.size || 0);
  const hasEveryone = message.content.includes('@everyone') || message.content.includes('@here');

  if (hasEveryone && !member?.permissions?.has(PermissionsBitField.Flags.MentionEveryone)) {
    return {
      isSpam: true,
      reason: 'Unauthorized @everyone / @here broadcast',
      action: 'delete_and_timeout',
    };
  }

  if (mentionCount >= MASS_MENTION_LIMIT) {
    return {
      isSpam: true,
      reason: `Mass pinging (${mentionCount} mentions)`,
      action: 'delete_and_timeout',
    };
  }

  // 2. Rapid Message Flood Check
  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }
  const timestamps = messageHistory.get(userId);
  timestamps.push(now);

  // Keep only timestamps within window
  while (timestamps.length > 0 && timestamps[0] < now - SPAM_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= SPAM_MAX_MESSAGES) {
    return {
      isSpam: true,
      reason: `Message flood (${timestamps.length} messages in ${SPAM_WINDOW_MS / 1000}s)`,
      action: 'delete_and_timeout',
    };
  }

  // 3. Phishing / Discord Scam Link Check
  const scamPattern = /(discord\.gg\/[a-z0-9]+|free-nitro|steamcommunity-nitro|discord-gift\.ru|discrod-nitro)/i;
  if (scamPattern.test(message.content) && !member?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) {
    return {
      isSpam: true,
      reason: 'Suspicious invite or phishing link',
      action: 'delete_and_timeout',
    };
  }

  return { isSpam: false };
}

async function handleSpamViolation(message, reason) {
  try {
    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const member = message.member;
    if (member && member.moderatable) {
      await member.timeout(5 * 60 * 1000, `Anti-Nuke Protection: ${reason}`).catch(() => {});
    }

    const alertMsg = await message.channel.send(
      `🛡️ **[Nova Anti-Nuke Shield]**: Stopped message spam from ${message.author}! (${reason})`
    );
    setTimeout(() => alertMsg.delete().catch(() => {}), 8000);
  } catch (err) {
    console.error('[AntiNuke] Error handling spam:', err.message);
  }
}

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
      reason: `Mass member join detected (${timestamps.length} accounts in ${RAID_JOIN_WINDOW_MS / 1000}s)`,
    };
  }

  return { isRaid: false };
}

module.exports = {
  checkMessageSpam,
  handleSpamViolation,
  checkRaidJoin,
};
