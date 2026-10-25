const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const {
  getGuildConfig,
  updateGuildConfig,
  clearChatHistory,
} = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure NovaBot AI channels, smart ambient chat, language, and game servers')
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View current server AI configuration')
    )
    .addSubcommand((sub) =>
      sub
        .setName('aichannel')
        .setDescription('Toggle a dedicated AI chat channel (bot replies to EVERY message there without a ping)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to toggle as an always-on AI chat room')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ambient')
        .setDescription('Configure Smart Ambient Mode (bot reads chat & chimes in when relevant)')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable or disable ambient chime-ins').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('cooldown')
            .setDescription('Minimum seconds between ambient chime-ins (default: 90)')
            .setMinValue(15)
            .setMaxValue(3600)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('gameserver')
        .setDescription('Set or add a Minecraft/game server so NovaBot can report live status & players')
        .addStringOption((opt) =>
          opt.setName('host').setDescription('Server IP or domain (e.g. play.myserver.com)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Friendly server name (e.g. Survival SMP)').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('port').setDescription('Server port (default: 25565)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('language')
        .setDescription('Set default language behavior for the server')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Language mode')
            .setRequired(true)
            .addChoices(
              { name: '✨ Auto-Match User (English + Nepali + Nepanglish)', value: 'auto' },
              { name: '🇬🇧 Primarily English', value: 'english' },
              { name: '🇳🇵 Primarily Nepali (नेपाली देवनागरी)', value: 'nepali' },
              { name: '🇳🇵 Primarily Romanized Nepali (Nepanglish)', value: 'roman_nepali' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('clearmemory')
        .setDescription('Clear the short-term conversation memory for this channel')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'default';

    if (sub === 'view') {
      const cfg = getGuildConfig(guildId);
      const aiChans =
        cfg.aiChannels.length > 0
          ? cfg.aiChannels.map((id) => `<#${id}>`).join(', ')
          : '*None set (use `/config aichannel` to add one)*';
      const servers =
        cfg.gameServers.length > 0
          ? cfg.gameServers.map((s) => `• **${s.name}**: \`${s.host}:${s.port}\``).join('\n')
          : '*None set (use `/config gameserver` to add one)*';

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`⚙️ ${cfg.botName} AI Configuration`)
        .addFields(
          { name: '🎭 Persona Vibe', value: `\`${cfg.persona}\``, inline: true },
          { name: '🗣️ Language Mode', value: `\`${cfg.languageMode}\``, inline: true },
          {
            name: '✨ Smart Ambient Mode',
            value: cfg.ambientEnabled
              ? `✅ Enabled (${cfg.ambientCooldownSec}s cooldown)`
              : '❌ Disabled',
            inline: true,
          },
          { name: '💬 Dedicated AI Channels (No Ping Needed)', value: aiChans },
          { name: '🎮 Linked Game Servers', value: servers }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'aichannel') {
      const channel = interaction.options.getChannel('channel');
      let added = false;
      updateGuildConfig(guildId, (cfg) => {
        const idx = cfg.aiChannels.indexOf(channel.id);
        if (idx >= 0) {
          cfg.aiChannels.splice(idx, 1);
          added = false;
        } else {
          cfg.aiChannels.push(channel.id);
          added = true;
        }
      });

      return interaction.reply({
        content: added
          ? `✅ ${channel} is now a **Dedicated AI Chat Channel**! I will read and reply to every message there without needing an @mention.`
          : `🔕 Removed ${channel} from Dedicated AI Chat Channels. I will still respond there when @mentioned or via Smart Ambient mode.`,
      });
    }

    if (sub === 'ambient') {
      const enabled = interaction.options.getBoolean('enabled');
      const cooldown = interaction.options.getInteger('cooldown');
      const cfg = updateGuildConfig(guildId, (c) => {
        c.ambientEnabled = enabled;
        if (cooldown) c.ambientCooldownSec = cooldown;
      });

      return interaction.reply({
        content: `✨ **Smart Ambient Mode** is now **${
          cfg.ambientEnabled ? 'ENABLED' : 'DISABLED'
        }** (Cooldown: \`${cfg.ambientCooldownSec}s\`).`,
      });
    }

    if (sub === 'gameserver') {
      const host = interaction.options.getString('host').trim();
      const name = interaction.options.getString('name')?.trim() || host;
      const port = interaction.options.getInteger('port') || 25565;

      updateGuildConfig(guildId, (cfg) => {
        const existingIdx = cfg.gameServers.findIndex(
          (s) => s.name.toLowerCase() === name.toLowerCase() || s.host.toLowerCase() === host.toLowerCase()
        );
        const entry = { name, host, port };
        if (existingIdx >= 0) {
          cfg.gameServers[existingIdx] = entry;
        } else {
          cfg.gameServers.push(entry);
        }
      });

      return interaction.reply({
        content: `🎮 Linked game server **${name}** (\`${host}:${port}\`)! Players can now ask me *"is the server up?"*, *"ko ko kheliracha?"*, or use \`/status\`.`,
      });
    }

    if (sub === 'language') {
      const mode = interaction.options.getString('mode');
      updateGuildConfig(guildId, (cfg) => {
        cfg.languageMode = mode;
      });
      return interaction.reply({
        content: `🗣️ Default language mode updated to **\`${mode}\`**!`,
      });
    }

    if (sub === 'clearmemory') {
      clearChatHistory(interaction.channelId);
      return interaction.reply({
        content: '🧹 Cleared short-term AI conversation history for this channel!',
      });
    }
  },
};
