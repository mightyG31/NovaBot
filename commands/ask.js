const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateAIResponse } = require('../utils/aiEngine');
const { getGuildConfig } = require('../utils/contextManager');
const { isHigherRoleOrOwner } = require('../utils/discordActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask NovaBot anything in English, Nepali (नेपाली), or Nepanglish!')
    .addStringOption((opt) =>
      opt
        .setName('prompt')
        .setDescription('What do you want to ask or talk about?')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const prompt = interaction.options.getString('prompt');
    const guildId = interaction.guildId || 'default';
    const cfg = getGuildConfig(guildId);

    const member = interaction.member;
    const isOwner = interaction.guild ? interaction.user.id === interaction.guild.ownerId : false;
    const isPrivileged = isHigherRoleOrOwner(member);
    const roleNames = member?.roles?.cache
      ? Array.from(member.roles.cache.values()).map((r) => r.name)
      : [];

    const { text, provider } = await generateAIResponse({
      guildId,
      guild: interaction.guild,
      channelId: interaction.channelId,
      channelName: interaction.channel?.name || 'chat',
      userName: member?.displayName || interaction.user.username,
      userRoles: roleNames,
      isOwnerOrHigher: isPrivileged,
      isOwner,
      userMessage: prompt,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `${cfg.botName} • Team Nova AI`,
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setDescription(text.slice(0, 4000))
      .addFields({
        name: '💬 Asked by',
        value: `${interaction.user} — *"${prompt.slice(0, 200)}"*`,
      })
      .setFooter({ text: `Engine: ${provider} • Fluent in English, नेपाली & Nepanglish` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
