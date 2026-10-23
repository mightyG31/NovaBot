const { SlashCommandBuilder } = require('discord.js');
const { parseDurationString, addReminder } = require('../utils/reminderManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Schedule a reminder with custom member or role pings')
    .addStringOption((opt) =>
      opt
        .setName('time')
        .setDescription('When to remind (e.g. 10m, 30m, 1h, 2h, 1d)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('message')
        .setDescription('Reminder message')
        .setRequired(true)
    )
    .addMentionableOption((opt) =>
      opt
        .setName('ping')
        .setDescription('Role or member to ping when reminder fires')
        .setRequired(false)
    ),

  async execute(interaction) {
    const timeStr = interaction.options.getString('time');
    const message = interaction.options.getString('message');
    const pingObj = interaction.options.getMentionable('ping');

    const durationMs = parseDurationString(timeStr);
    if (!durationMs) {
      await interaction.reply({
        content: `⚠️ Invalid time format: \`${timeStr}\`. Use format like \`10m\`, \`30m\`, \`1h\`, \`2h\`, or \`1d\`.`,
        ephemeral: true,
      });
      return;
    }

    const pingTarget = pingObj ? `<@${pingObj.id}>` : `<@${interaction.user.id}>`;

    const reminder = addReminder({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      authorId: interaction.user.id,
      authorName: interaction.member?.displayName || interaction.user.username,
      message,
      durationMs,
      pingTarget,
    });

    const fireDate = new Date(reminder.targetTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await interaction.reply({
      content: `⏰ **Reminder Set!** I will alert ${pingTarget} in **${timeStr}** (around ${fireDate}):\n> "${message}"`,
    });
  },
};
