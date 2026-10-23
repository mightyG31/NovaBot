const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKnowledge, addKnowledge, removeKnowledge } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kb')
    .setDescription('Teach Sathi AI about your server (IPs, rules, lore, FAQs, staff, commands)')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View everything Sathi knows about your server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Teach Sathi a new fact, rule, or FAQ')
        .addStringOption((opt) =>
          opt.setName('topic').setDescription('Short topic name (e.g. Server IP, Rules, Owner)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('fact').setDescription('The information Sathi should remember and share').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a knowledge item by topic or ID')
        .addStringOption((opt) =>
          opt.setName('query').setDescription('Topic name or ID to remove').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'default';

    if (sub === 'list') {
      const list = getKnowledge(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🧠 Server Knowledge Base (What Sathi Knows)')
        .setDescription(
          list
            .map((k, i) => `**${i + 1}. [${k.topic}]** (\`${k.id}\`)\n${k.fact}`)
            .join('\n\n')
            .slice(0, 4000)
        )
        .setFooter({ text: 'Use /kb add to teach Sathi more about your server!' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'add') {
      const topic = interaction.options.getString('topic');
      const fact = interaction.options.getString('fact');
      const addedBy = interaction.member?.displayName || interaction.user.username;
      const item = addKnowledge(guildId, topic, fact, addedBy);

      return interaction.reply({
        content: `🧠 **Got it!** I learned **[${item.topic}]**:\n> ${item.fact}\n*(I'll use this whenever players ask in English or Nepali!)*`,
      });
    }

    if (sub === 'remove') {
      const query = interaction.options.getString('query');
      const removed = removeKnowledge(guildId, query);
      if (!removed) {
        return interaction.reply({
          content: `❌ No knowledge entry found matching \`${query}\`.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: `🗑️ Forgot knowledge entry **[${removed.topic}]**.`,
      });
    }
  },
};
