require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { deployCommands } = require('./deploy-commands');
const {
  getGuildConfig,
  recordChannelMessage,
  canTriggerAmbient,
  markAmbientTriggered,
  isUserAuthorized,
  addKnowledge,
} = require('./utils/contextManager');
const {
  generateAIResponse,
  shouldAmbientChimeIn,
} = require('./utils/aiEngine');
const {
  executeServerAction,
  isHigherRoleOrOwner,
} = require('./utils/discordActions');
const {
  checkMessageSpam,
  handleSpamViolation,
  checkRaidJoin,
} = require('./utils/antiNuke');
const { parseLearningTrigger } = require('./utils/learningEngine');
const {
  parseEmbedCommand,
  parseAnnouncementCommand,
  parseGiveawayCommand,
  startGiveaway,
  createCustomEmbed,
} = require('./utils/embedBuilderHelper');
const { fetchImageBuffer } = require('./utils/recipeImages');
const {
  createTicketPanelEmbed,
  handleTicketButtonClick,
  handleTicketClose,
} = require('./utils/ticketManager');
const {
  addReminder,
  parseReminderChat,
  startReminderWatchdog,
} = require('./utils/reminderManager');
const { fetchPlayerTiers, createTierEmbed } = require('./utils/tiersManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember],
});

client.commands = new Collection();

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

function splitDiscordMessage(text, maxLength = 1950) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitIdx = remaining.lastIndexOf('\n', maxLength);
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIdx === -1) splitIdx = maxLength;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log('==========================================================');
  console.log(`🤖 NovaBot Online as: ${readyClient.user.tag}`);
  console.log(`⚔️ Team Nova Shield & Anti-Nuke Guardian Active 24/7`);
  console.log(`🧠 In-Chat Learning, Custom Embeds & Giveaways Ready`);
  console.log('==========================================================');

  if (process.env.AUTO_DEPLOY !== 'false') {
    await deployCommands();
  }

  const activities = [
    { name: 'Protecting Team Nova 🛡️', type: ActivityType.Watching },
    { name: 'CPvP & Scrims | NovaBot', type: ActivityType.Playing },
    { name: '24/7 AI Chat & Enforcer', type: ActivityType.Listening },
    { name: '/ask • /status • /catchup', type: ActivityType.Listening },
  ];
  let idx = 0;
  const updatePresence = () => {
    const act = activities[idx % activities.length];
    readyClient.user.setPresence({
      activities: [act],
      status: 'online',
    });
    idx++;
  };
  updatePresence();
  setInterval(updatePresence, 60 * 1000);

  // Start Background Scheduled Reminder Watchdog
  startReminderWatchdog(readyClient);
});

// Auto-Leave Unauthorized Servers (Private Bot Guard for Team Nova)
client.on(Events.GuildCreate, async (guild) => {
  const allowedGuildId = process.env.GUILD_ID?.trim();
  if (allowedGuildId && allowedGuildId !== '123456789012345678' && guild.id !== allowedGuildId) {
    console.warn(`[Security Alert] NovaBot was added to unauthorized server: ${guild.name} (${guild.id}). Leaving immediately.`);
    try {
      const defaultChannel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(client.user).has('SendMessages'));
      if (defaultChannel) {
        await defaultChannel.send('🛡️ **Access Denied**: NovaBot is a private enforcer exclusive to **Team Nova**. Leaving server.');
      }
    } catch (_) {}
    await guild.leave().catch(() => {});
  }
});

// Anti-Raid Mass Join Watchdog
client.on(Events.GuildMemberAdd, async (member) => {
  const raid = checkRaidJoin(member);
  if (raid.isRaid) {
    console.warn(`[AntiRaid] ${raid.reason}`);
    try {
      const owner = await member.guild.fetchOwner();
      if (owner) {
        await owner.send(`🚨 **[NovaBot Raid Alert]**: Detected potential bot raid in **${member.guild.name}**! (${raid.reason})`).catch(() => {});
      }
    } catch (_) {}
  }
});

// Slash Command & Interactive Button handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (['btn_ticket_apply', 'btn_ticket_suggest', 'btn_ticket_help'].includes(interaction.customId)) {
      await handleTicketButtonClick(interaction);
      return;
    }
    if (interaction.customId === 'btn_ticket_close') {
      await handleTicketClose(interaction);
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Command Error: /${interaction.commandName}]`, err);
    const errMsg = '⚠️ Error processing command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
    }
  }
});

// Message Event: Anti-Spam, In-Chat Learning, Giveaways, Embeds, and AI Chat
client.on(Events.MessageCreate, async (message) => {
  // Always record message into rolling history
  recordChannelMessage(message);

  if (message.author.bot) return;
  if (!message.content || !message.content.trim()) return;

  // 1. Anti-Nuke & Spam Filter Check
  const spamCheck = checkMessageSpam(message);
  if (spamCheck.isSpam) {
    await handleSpamViolation(message, spamCheck.reason);
    return;
  }

  const guildId = message.guildId || 'default';
  const cfg = getGuildConfig(guildId);
  const botId = client.user?.id;
  const member = message.member;
  const isOwner = message.guild ? message.author.id === message.guild.ownerId : false;
  const isPrivileged = isHigherRoleOrOwner(member);
  const isAuthorized = isUserAuthorized(guildId, message.author.id, isOwner || isPrivileged);

  // 2. Dynamic In-Chat Learning Trigger
  const learnTrigger = parseLearningTrigger(message.content);
  if (learnTrigger.isLearning) {
    if (!isAuthorized) {
      await message.reply('Tero aukaat ma bas b**te! I need permission from the owner or someone that owner has authorized to be able to give command to me.');
      return;
    }
    const saved = addKnowledge(guildId, learnTrigger.topic, learnTrigger.fact, member?.displayName || message.author.username);
    await message.reply(`🧠 **Mastered & Stored in Nova Memory!**\n> **[${saved.topic}]**: ${saved.fact}\n*(I will use this knowledge across the server!)*`);
    return;
  }

  // 3. Dynamic Custom Embed Trigger (e.g. "novabot embed Title | Description | #ff0055")
  const embedCmd = parseEmbedCommand(message.content);
  if (embedCmd) {
    if (!isAuthorized) {
      await message.reply('I need permission from the owner or someone that owner has authorized to be able to give command to me.');
      return;
    }
    const custom = createCustomEmbed(embedCmd);
    await message.channel.send({ embeds: [custom] });
    if (message.deletable) await message.delete().catch(() => {});
    return;
  }

  // 4. Dynamic Announcement Trigger (e.g. "novabot announce Title | Details" or "oi novabot announce Scrims Tonight")
  const announceCmd = parseAnnouncementCommand(message.content);
  if (announceCmd) {
    if (!isAuthorized) {
      await message.reply('I need permission from the owner or someone that owner has authorized to be able to give command to me.');
      return;
    }
    const annEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`📢 ${announceCmd.title}`)
      .setDescription(announceCmd.content)
      .setFooter({ text: `Announced by ${member?.displayName || message.author.username} • Team Nova` })
      .setTimestamp();

    await message.channel.send({ content: '@everyone', embeds: [annEmbed] });
    if (message.deletable) await message.delete().catch(() => {});
    return;
  }

  // 5. Dynamic Giveaway Trigger (e.g. "novabot giveaway VIP Rank | 10" or "oi novabot giveaway Netherite Set | 5")
  const giveawayCmd = parseGiveawayCommand(message.content);
  if (giveawayCmd) {
    if (!isAuthorized) {
      await message.reply('I need permission from the owner or someone that owner has authorized to be able to give command to me.');
      return;
    }
    await startGiveaway({
      channel: message.channel,
      prize: giveawayCmd.prize,
      durationMinutes: giveawayCmd.durationMinutes,
      hostName: member?.displayName || message.author.username,
      client,
    });
    if (message.deletable) await message.delete().catch(() => {});
    return;
  }

  // 6. Dynamic In-Chat Scheduled Reminder Trigger (e.g. "novabot remind in 30m @Team Nova | Scrims starting")
  const reminderCmd = parseReminderChat(message.content);
  if (reminderCmd) {
    if (reminderCmd.pingTarget && !isAuthorized) {
      await message.reply('Tero aukaat ma bas b**te! Only the Owner or someone with Administrator permissions can schedule reminders with role or member pings.');
      return;
    }
    const rem = addReminder({
      guildId,
      channelId: message.channelId,
      authorId: message.author.id,
      authorName: member?.displayName || message.author.username,
      message: reminderCmd.message,
      durationMs: reminderCmd.durationMs,
      pingTarget: reminderCmd.pingTarget,
    });
    const targetPing = reminderCmd.pingTarget || `<@${message.author.id}>`;
    await message.reply(`⏰ **Reminder Set!** I will alert ${targetPing} in **${reminderCmd.durationStr}**:\n> "${reminderCmd.message}"`);
    return;
  }

  // 7. Dynamic In-Chat Competitive Tier Lookup (e.g. "check tiers for minemanner" or "novabot tiers minemanner")
  const tierMatch =
    message.content.match(/(?:check\s+tiers?(?:\s+for)?|tiers?\s+(?:of|for)|tier\s+kasto\s+cha)\s+([a-zA-Z0-9_]+)/i) ||
    message.content.match(/^(?:hey\s+bot\s+|bot\s+|novabot\s+)?tiers?\s+([a-zA-Z0-9_]+)/i) ||
    message.content.match(/\b([a-zA-Z0-9_]{3,16})\s+ko\s+tier\b/i);
  if (tierMatch) {
    const ign = tierMatch[1].trim();
    await message.channel.sendTyping();
    const data = await fetchPlayerTiers(ign);
    const embed = createTierEmbed(data);
    await message.reply({ embeds: [embed] });
    return;
  }

  // 8. Natural Chat Ticket Hub Trigger (e.g. "hey bot go look after ticket for me")
  const ticketPanelMatch = /\b(?:look\s+after\s+tickets?|manage\s+tickets?|setup\s+tickets?|ticket\s+panel|tickets?\s+herdai\s+bas)\b/i.test(message.content);
  if (ticketPanelMatch) {
    if (!isAuthorized) {
      await message.reply('I need permission from the owner or someone that owner has authorized to be able to give command to me.');
      return;
    }
    const panel = createTicketPanelEmbed();
    await message.channel.send(panel);
    await message.reply('Ticket hub deploy handiye daju!');
    return;
  }

  // 9. Natural Chat Ticket Close (e.g. "close this ticket", "ticket sakiyo")
  const ticketCloseMatch = /\b(?:close\s+ticket|ticket\s+close|ticket\s+sakiyo|ticket\s+delete)\b/i.test(message.content);
  if (ticketCloseMatch && message.channel.name && (message.channel.name.includes('apply-') || message.channel.name.includes('ticket-') || message.channel.name.includes('suggest-') || message.channel.name.includes('help-'))) {
    if (!isAuthorized) {
      await message.reply('Tero aukaat ma bas b**te! Only the Owner or someone with Administrator permissions can close or delete tickets.');
      return;
    }
    await handleTicketClose({
      channel: message.channel,
      member,
      user: message.author,
      reply: async (p) => message.channel.send(p),
    });
    return;
  }

  // 6. Conversational AI Routing (Dedicated AI Channel, Mention, Reply, Ambient)
  const isDM = !message.guildId;
  const isMentioned = Boolean(botId && message.mentions.users.has(botId));
  let isReplyToBot = false;

  if (message.reference?.messageId) {
    try {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (refMsg && refMsg.author?.id === botId) {
        isReplyToBot = true;
      }
    } catch (_) {}
  }

  const isDedicatedAIChannel = cfg.aiChannels.includes(message.channelId);
  const isDirectlyAddressed =
    /^(?:hey\s+|oi\s+|yo\s+|hello\s+|sathi\s+|sun\s+na\s+)?(?:novabot|nova|bot)\b/i.test(message.content) ||
    /\b(?:novabot)\b/i.test(message.content);

  const isAmbientTrigger =
    !isDM &&
    !isMentioned &&
    !isReplyToBot &&
    !isDedicatedAIChannel &&
    !isDirectlyAddressed &&
    cfg.ambientEnabled &&
    canTriggerAmbient(message.channelId, cfg.ambientCooldownSec) &&
    shouldAmbientChimeIn(message.content);

  if (!isDM && !isMentioned && !isReplyToBot && !isDedicatedAIChannel && !isAmbientTrigger && !isDirectlyAddressed) {
    return;
  }

  if (isAmbientTrigger) {
    markAmbientTriggered(message.channelId);
  }

  let cleanPrompt = botId
    ? message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim() || 'K cha Nova!'
    : message.content.trim();
  cleanPrompt = cleanPrompt.replace(/^(?:hey\s+|oi\s+|yo\s+|hello\s+)?(?:novabot|nova|bot)[,:\s]*/i, '').trim() || cleanPrompt;

  try {
    await message.channel.sendTyping();

    const roleNames = member?.roles?.cache ? Array.from(member.roles.cache.values()).map((r) => r.name) : [];

    const { text, action, params, imageUrl } = await generateAIResponse({
      guildId,
      channelId: message.channelId,
      channelName: message.channel?.name || 'chat',
      userName: member?.displayName || message.author.username,
      userRoles: roleNames,
      isOwnerOrHigher: isPrivileged,
      isOwner,
      isAuthorizedCommander: isAuthorized,
      userMessage: cleanPrompt,
    });

    const chunks = splitDiscordMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        const replyPayload = {
          content: chunks[i],
          allowedMentions: { repliedUser: false },
        };
        if (imageUrl) {
          const imgData = await fetchImageBuffer(imageUrl);
          if (imgData) {
            replyPayload.files = [new AttachmentBuilder(imgData.buffer, { name: imgData.filename })];
          } else {
            replyPayload.files = [imageUrl];
          }
        }
        await message.reply(replyPayload);
      } else {
        await message.channel.send(chunks[i]);
      }
    }

    if (action && message.guild) {
      if (action === 'ticket_setup') {
        const panel = createTicketPanelEmbed();
        await message.channel.send(panel);
        return;
      }
      if (action === 'ticket_close') {
        await handleTicketClose({
          channel: message.channel,
          member,
          user: message.author,
          reply: async (p) => message.channel.send(p),
        });
        return;
      }

      const botMember = await message.guild.members.fetch(client.user.id);
      const actionResult = await executeServerAction({
        action,
        params,
        guild: message.guild,
        channel: message.channel,
        requesterMember: member,
        botMember,
        isCommanderAuthorized: isAuthorized,
      });

      if (actionResult.success) {
        await message.channel.send(`⚡ **[Nova Action Executed]**: ${actionResult.message}`);
      } else {
        await message.channel.send(`⚠️ **[Action Refused/Failed]**: ${actionResult.message}`);
      }
    }
  } catch (err) {
    console.error('[NovaBot Message Error]:', err.message);
  }
});

const http = require('http');

// Lightweight Health Check HTTP Server for 24/7 Cloud Hosting (BotKeep, Render, Pterodactyl)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'online',
      bot: client.user ? client.user.tag : 'Starting up...',
      team: 'Nova',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(PORT, () => {
  console.log(`🌐 [BotKeep / Web Keep-Alive] Health server active on port ${PORT}`);
});

const token = process.env.DISCORD_TOKEN?.trim();
if (!token || token === 'your_new_bot_token_here') {
  console.log('==========================================================');
  console.log('⚠️  SETUP NEEDED: Add DISCORD_TOKEN & CLIENT_ID in .env');
  console.log('   Add free GEMINI_API_KEY from aistudio.google.com/apikey');
  console.log('==========================================================');
} else {
  client.login(token).catch((err) => {
    console.error('❌ Failed to login to Discord:', err.message);
  });
}
