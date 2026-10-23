const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEvents, addEvent, removeEvent, clearEvents } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Manage active server events & announcements so Sathi can tell players what is happening!')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('See all active server events & announcements')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Post a new event or update so the bot knows what is happening')
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Event title (e.g. PvP Tournament Tonight)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('details')
            .setDescription('Details, time, prizes, or instructions')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an event by title or ID')
        .addStringOption((opt) =>
          opt.setName('query').setDescription('Event title keyword or ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('clear').setDescription('Clear all active events')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'default';

    if (sub === 'list') {
      const events = getEvents(guildId);
      if (events.length === 0) {
        return interaction.reply({
          content:
            '📭 No active events posted right now! Add one with `/event add` so I can tell players what is happening.',
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('📢 Active Server Events & What\'s Happening')
        .setDescription(
          events
            .map(
              (e, idx) =>
                `**${idx + 1}. ${e.title}** (\`${e.id}\`)\n> ${e.details}\n> *Added by ${e.addedBy}*`
            )
            .join('\n\n')
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'add') {
      const title = interaction.options.getString('title');
      const details = interaction.options.getString('details');
      const addedBy = interaction.member?.displayName || interaction.user.username;
      const ev = addEvent(guildId, title, details, addedBy);

      return interaction.reply({
        content: `✅ **Event Added!** Whenever players ask *"what is happening?"* or *"k bhairacha?"*, I will let them know about:\n> **${ev.title}** — ${ev.details}`,
      });
    }

    if (sub === 'remove') {
      const query = interaction.options.getString('query');
      const removed = removeEvent(guildId, query);
      if (!removed) {
        return interaction.reply({
          content: `❌ Could not find an event matching \`${query}\`. Use \`/event list\` to see active events.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: `🗑️ Removed event **${removed.title}**.`,
      });
    }

    if (sub === 'clear') {
      clearEvents(guildId);
      return interaction.reply({
        content: '🧹 Cleared all active server events.',
      });
    }
  },
};
