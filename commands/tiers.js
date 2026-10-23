const { SlashCommandBuilder } = require('discord.js');
const { fetchPlayerTiers, createTierEmbed } = require('../utils/tiersManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tiers')
    .setDescription('Look up competitive Minecraft PvP tiers across MCTiers, PVPTiers & CentralTiers')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Minecraft IGN to search')
        .setRequired(true)
    ),

  async execute(interaction) {
    const username = interaction.options.getString('username');
    await interaction.deferReply();

    try {
      const data = await fetchPlayerTiers(username);
      const embed = createTierEmbed(data);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Command: /tiers Error]:', err.message);
      await interaction.editReply({
        content: `⚠️ Failed to fetch tier data for **${username}**. Please try again.`,
      });
    }
  },
};
