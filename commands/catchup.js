const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateCatchupSummary } = require('../utils/aiEngine');
const { getRecentChannelMessages, getGuildConfig } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('catchup')
    .setDescription('Find out what happened recently in chat & across the server! (English / Nepali)')
    .addIntegerOption((opt) =>
      opt
        .setName('messages')
        .setDescription('How many recent messages to scan (10 - 60, default: 30)')
        .setMinValue(10)
        .setMaxValue(60)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Language for the summary')
        .setRequired(false)
        .addChoices(
          { name: '✨ Auto (English + Nepanglish Vibe)', value: 'auto' },
          { name: '🇬🇧 English', value: 'english' },
          { name: '🇳🇵 Nepali (नेपाली देवनागरी)', value: 'nepali' },
          { name: '🇳🇵 Romanized Nepali (Nepanglish)', value: 'roman_nepali' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const count = interaction.options.getInteger('messages') || 30;
    const language = interaction.options.getString('language') || 'auto';
    const guildId = interaction.guildId || 'default';
    const cfg = getGuildConfig(guildId);

    // Try fetching live messages directly from the Discord channel for maximum accuracy
    let messagesToSummarize = [];
    try {
      if (interaction.channel && interaction.channel.messages) {
        const fetched = await interaction.channel.messages.fetch({ limit: count });
        messagesToSummarize = Array.from(fetched.values())
          .reverse()
          .filter((m) => m.content && m.content.trim().length > 0)
          .map((m) => ({
            authorName: m.member?.displayName || m.author?.username || 'Player',
            content: m.content.slice(0, 400),
            timestamp: m.createdAt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
      }
    } catch (_) {
      // Fallback to in-memory buffer if channel history fetch lacks permission
      messagesToSummarize = getRecentChannelMessages(interaction.channelId, count);
    }

    const { text, provider } = await generateCatchupSummary({
      guildId,
      channelId: interaction.channelId,
      channelName: interaction.channel?.name || 'general',
      messagesToSummarize,
      language,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00d166)
      .setTitle(`📰 What's Happening in #${interaction.channel?.name || 'Server'}?`)
      .setDescription(text.slice(0, 4000))
      .setFooter({
        text: `Scanned ${messagesToSummarize.length} recent messages • ${cfg.botName} (${provider})`,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
