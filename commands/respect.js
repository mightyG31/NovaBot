const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const {
  getRespectedUsers,
  addRespectedUser,
  removeRespectedUser,
  getGuildConfig,
} = require('../utils/contextManager');
const { isHigherRoleOrOwner } = require('../utils/discordActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('respect')
    .setDescription('Manage Owner-level respect & VIP status for clan members')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Grant a member Owner-level reverence & full command authority')
        .addUserOption((opt) =>
          opt
            .setName('target')
            .setDescription('The player to treat with Owner-level respect')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('note')
            .setDescription('Optional reason / note (e.g. Co-Leader, Best Friend, Clan Elder)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove Owner-level respect from a member')
        .addUserOption((opt) =>
          opt
            .setName('target')
            .setDescription('The player to remove from Owner-level respect')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('View all members holding Owner-level respect and authority')
    ),

  async execute(interaction) {
    const isOwner = Boolean(
      (interaction.guild?.ownerId && interaction.user.id === interaction.guild.ownerId) ||
      (process.env.OWNER_IDS && process.env.OWNER_IDS.split(',').map((id) => id.trim()).includes(interaction.user.id))
    );
    const isPrivileged = isHigherRoleOrOwner(interaction.member) || isOwner;

    const sub = interaction.options.getSubcommand();

    if (sub === 'add' || sub === 'remove') {
      if (!isPrivileged) {
        return interaction.reply({
          content: '❌ **Tero aukaat ma bas b**te!** Only the Server Owner or Leaders can grant or remove Owner-level respect.',
          ephemeral: true,
        });
      }

      const target = interaction.options.getUser('target');
      const note = interaction.options.getString('note') || 'Honored Clan VIP';

      if (sub === 'add') {
        addRespectedUser(interaction.guildId, target.id, target.username, interaction.user.username);
        return interaction.reply({
          content: `👑 **Owner-Level Respect Granted!**\nI now treat <@${target.id}> with the exact same deep loyalty, reverence, and command authority as the Owner himself!`,
        });
      }

      if (sub === 'remove') {
        removeRespectedUser(interaction.guildId, target.id);
        return interaction.reply({
          content: `✅ Removed Owner-level respect status for <@${target.id}>.`,
        });
      }
    }

    if (sub === 'list') {
      const list = getRespectedUsers(interaction.guildId);
      const cfg = getGuildConfig(interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`👑 ${cfg.botName} — Owner-Respected VIP Roster`)
        .setDescription(
          list.length > 0
            ? list
                .map(
                  (u, i) =>
                    `**${i + 1}.** <@${u.userId}> (\`${u.username || u.userId}\`)\n   • Granted By: **${u.grantedBy || 'Owner'}**`
                )
                .join('\n\n')
            : 'No VIP members have been granted Owner-level respect yet.\n*The Owner can add members using `/respect add @user`!*'
        )
        .setFooter({ text: `${cfg.botName} • Hierarchy & Reverence System` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
