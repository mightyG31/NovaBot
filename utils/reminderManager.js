const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const REMINDERS_FILE = path.join(__dirname, '..', 'data', 'reminders.json');

function loadReminders() {
  try {
    if (fs.existsSync(REMINDERS_FILE)) {
      return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[ReminderManager] Error loading reminders.json:', err.message);
  }
  return [];
}

function saveReminders(data) {
  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[ReminderManager] Error saving reminders.json:', err.message);
  }
}

let activeReminders = loadReminders();

/**
 * Parses duration strings like 10s, 5m, 30m, 1h, 2d
 */
function parseDurationString(str = '') {
  const match = str.trim().toLowerCase().match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?)$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2][0];

  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

/**
 * Creates a scheduled reminder
 */
function addReminder({ guildId, channelId, authorId, authorName, message, durationMs, pingTarget = '' }) {
  const targetTimestamp = Date.now() + durationMs;
  const id = `remind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const reminder = {
    id,
    guildId,
    channelId,
    authorId,
    authorName,
    message,
    targetTimestamp,
    pingTarget: pingTarget.trim(),
    createdAt: new Date().toISOString(),
  };

  activeReminders.push(reminder);
  saveReminders(activeReminders);
  return reminder;
}

/**
 * Parses natural chat reminder commands:
 * e.g. "novabot remind in 30m @Team Nova | Tournament match starting"
 * e.g. "novabot remind in 2h <@123> Check SMP base"
 */
function parseReminderChat(content = '') {
  const clean = content.trim();
  const timeMatch = clean.match(/^novabot\s+remind\s+(?:me\s+)?in\s+(\d+\s*[a-zA-Z]+)(.*)/i);
  if (!timeMatch) return null;

  const durationStr = timeMatch[1].trim();
  const durationMs = parseDurationString(durationStr);
  if (!durationMs) return null;

  const remainder = timeMatch[2].trim();
  let pingTarget = '';
  let msg = 'Reminder from NovaBot!';

  if (remainder.includes('|')) {
    const parts = remainder.split('|');
    const potentialPing = parts[0].trim();
    if (potentialPing.startsWith('@') || potentialPing.startsWith('<@')) {
      pingTarget = potentialPing;
      msg = parts.slice(1).join('|').trim();
    } else {
      msg = remainder.replace(/^\|\s*/, '').trim();
    }
  } else {
    const mentionMatch = remainder.match(/^([<@&!0-9a-zA-Z_]+)\s*(.*)/);
    if (mentionMatch && (mentionMatch[1].startsWith('@') || mentionMatch[1].startsWith('<@'))) {
      pingTarget = mentionMatch[1];
      msg = mentionMatch[2].trim() || msg;
    } else if (remainder) {
      msg = remainder;
    }
  }

  return {
    durationMs,
    durationStr,
    pingTarget,
    message: msg || 'Scheduled Reminder',
  };
}

/**
 * Background loop checking for due reminders every 10 seconds
 */
function startReminderWatchdog(client) {
  setInterval(async () => {
    const now = Date.now();
    const due = activeReminders.filter((r) => r.targetTimestamp <= now);
    if (due.length === 0) return;

    activeReminders = activeReminders.filter((r) => r.targetTimestamp > now);
    saveReminders(activeReminders);

    for (const rem of due) {
      try {
        const channel = await client.channels.fetch(rem.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        const pingStr = rem.pingTarget ? `${rem.pingTarget} ` : `<@${rem.authorId}> `;

        const embed = new EmbedBuilder()
          .setColor(0xff0055)
          .setTitle('⏰ NovaBot Scheduled Reminder')
          .setDescription(`**${rem.message}**\n\n*(Scheduled by ${rem.authorName})*`)
          .setFooter({ text: 'Team Nova 24/7 Reminders & Scheduler' })
          .setTimestamp();

        await channel.send({
          content: `🔔 ${pingStr}`,
          embeds: [embed],
        });
      } catch (err) {
        console.error(`[Reminder Error] Failed to fire reminder ${rem.id}:`, err.message);
      }
    }
  }, 10 * 1000);
}

module.exports = {
  parseDurationString,
  addReminder,
  parseReminderChat,
  startReminderWatchdog,
};
