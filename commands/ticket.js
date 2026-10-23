const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createTicketPanelEmbed, handleTicketClose } = require('../utils/ticketManager');
const { isHigherRoleOrOwner } = require('../utils/discordActions');
const { isUserAuthorized } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the automated Team Nova ticket & tryout system')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Deploy the interactive ticket panel in this channel')
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close and archive the current ticket channel')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const isOwner = interaction.guild ? interaction.user.id === interaction.guild.ownerId : false;
    const isPrivileged = isHigherRoleOrOwner(interaction.member);
    const isAuthorized = isUserAuthorized(interaction.guildId, interaction.user.id, isOwner || isPrivileged);

    if (sub === 'setup') {
      if (!isAuthorized) {
        await interaction.reply({
          content: '⚠️ Only the Server Owner or authorized Nova Leaders can deploy ticket panels.',
          ephemeral: true,
        });
        return;
      }

      const panel = createTicketPanelEmbed();
      await interaction.channel.send(panel);
      await interaction.reply({
        content: '✅ Official Team Nova ticket panel deployed successfully!',
        ephemeral: true,
      });
      return;
    }

    if (sub === 'close') {
      await handleTicketClose(interaction);
    }
  },
};
