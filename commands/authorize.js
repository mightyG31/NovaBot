const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getGuildConfig,
  addAuthorizedCommander,
  removeAuthorizedCommander,
} = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('authorize')
    .setDescription('Manage who is authorized to give commands to NovaBot (Server Owner Only)')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all members authorized by the Owner to command NovaBot')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Authorize a user to command NovaBot (Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to authorize').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from authorized commanders (Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to de-authorize').setRequired(true)
        )
    ),

  async execute(interaction) {
    const isOwner = interaction.guild ? interaction.user.id === interaction.guild.ownerId : false;

    if (!isOwner) {
      return interaction.reply({
        content:
          '❌ **Access Denied**: Only the **Server Owner** has the power to authorize or de-authorize commanders for NovaBot.\n> *"I need permission from the owner or someone that owner has authorized to be able to give command to me."*',
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'default';
    const cfg = getGuildConfig(guildId);

    if (sub === 'list') {
      const list = cfg.authorizedCommanders || [];
      const mentions = list.length > 0 ? list.map((id) => `<@${id}> (\`${id}\`)`).join('\n') : '*No additional commanders authorized yet (Only the Owner).*';

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('👑 NovaBot Authorized Commanders')
        .setDescription(
          `**Server Owner:** <@${interaction.guild.ownerId}> (Full Master Authority)\n\n**Owner-Authorized Commanders:**\n${mentions}`
        )
        .setFooter({ text: 'NovaBot strictly refuses command execution from anyone else.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'add') {
      const targetUser = interaction.options.getUser('user');
      addAuthorizedCommander(guildId, targetUser.id);

      return interaction.reply({
        content: `✅ **Authorized**: ${targetUser} has been authorized by the Owner to give commands to NovaBot!`,
      });
    }

    if (sub === 'remove') {
      const targetUser = interaction.options.getUser('user');
      removeAuthorizedCommander(guildId, targetUser.id);

      return interaction.reply({
        content: `🗑️ **Removed**: ${targetUser} is no longer authorized to give commands to NovaBot.`,
      });
    }
  },
};
