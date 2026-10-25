const { SlashCommandBuilder } = require('discord.js');
const { getRandomRoast, synthesizeDynamicRoast } = require('../utils/roastEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Deliver a savage competitive gaming roast / trash-talk to someone')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The player to shred/roast')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('context')
        .setDescription('Context or reason (e.g. totem popped, missed pots, 0-5 in duel)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const context = interaction.options.getString('context') || '';

    let roast = context ? synthesizeDynamicRoast(context) : getRandomRoast();

    if (targetUser) {
      roast = `<@${targetUser.id}> ${roast}`;
    }

    await interaction.reply({
      content: roast,
      allowedMentions: targetUser ? { users: [targetUser.id] } : { parse: [] },
    });
  },
};
