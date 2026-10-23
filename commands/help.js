const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('See everything NovaBot can do for Team Nova!'),

  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guildId || 'default');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`⚔️ ${cfg.botName} — Official Team Nova AI Companion`)
      .setDescription(
        `I am the humanlike AI companion and enforcer for **Team Nova** (Nepali Minecraft PvP gods, grinders & duelists).\nI read messages, communicate fluidly in **English**, **Nepali (नेपाली)**, and **Romanized Nepali (Nepanglish)**, hold deepest respect for our Owners and Higher Roles, and roast anyone disrespecting our leaders!`
      )
      .addFields(
        {
          name: '💬 How to Talk With NovaBot',
          value: [
            '1️⃣ **Dedicated AI Channel:** In any channel set via `/config aichannel`, I automatically join conversations without needing pings or @mentions!',
            '2️⃣ **Direct Mentions & Replies:** Ping `@NovaBot` or reply to any of my messages.',
            '3️⃣ **Smart Ambient Mode:** Ask in chat *"k bhairacha?"*, *"what is happening?"*, *"is server up?"*, and I jump in naturally.',
          ].join('\n'),
        },
        {
          name: '👑 Owner & Higher Role Reverence',
          value:
            'I hold highest respect for Server Owners, Leaders, and Nova higher roles. If anyone speaks ill of our leaders, I turn into an unfiltered defense machine with savage Routiney-style roasts & curses.',
        },
        {
          name: '🛠️ Server Management & Work',
          value:
            'When instructed by an Owner or authorized higher role, I can perform actions directly: `purge messages`, `timeout <user>`, `kick <user>`, `ban <user>`, `set slowmode`, or `update channel topic`.',
        },
        {
          name: '📜 Slash Commands',
          value: [
            '`/ask <prompt>` — Chat with NovaBot (unified self-adaptive AI)',
            '`/catchup [messages]` — Summarize recent chat drama, topics & announcements',
            '`/status [address]` — Live Minecraft server status, ping & online player roster',
            '`/translate <text> <to>` — Translate between English, नेपाली, and Nepanglish',
            '`/event list | add | remove` — Manage upcoming scrims, events & tournaments',
            '`/kb list | add | remove` — Teach NovaBot custom server rules, IPs, and lore',
            '`/config view | aichannel | ambient | gameserver` — Server settings',
          ].join('\n'),
        }
      )
      .setFooter({ text: `${cfg.botName} • Built for Team Nova` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
