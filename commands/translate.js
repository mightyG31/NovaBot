const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { translateText } = require('../utils/aiEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate messages between English, Nepali (नेपाली), and Romanized Nepali!')
    .addStringOption((opt) =>
      opt
        .setName('text')
        .setDescription('The message or phrase you want to translate')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('to')
        .setDescription('Target language')
        .setRequired(true)
        .addChoices(
          { name: '🇳🇵 Romanized Nepali (Nepanglish - e.g. "K cha sathi")', value: 'roman_nepali' },
          { name: '🇳🇵 Nepali Script (नेपाली देवनागरी)', value: 'nepali' },
          { name: '🇬🇧 English', value: 'english' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString('text');
    const targetLanguage = interaction.options.getString('to');
    const guildId = interaction.guildId || 'default';

    const { text: translated, provider } = await translateText({
      text,
      targetLanguage,
      guildId,
    });

    const labelMap = {
      english: '🇬🇧 English',
      nepali: '🇳🇵 Nepali (देवनागरी)',
      roman_nepali: '🇳🇵 Romanized Nepali (Nepanglish)',
    };

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🌐 Translation → ${labelMap[targetLanguage] || targetLanguage}`)
      .addFields(
        { name: '📥 Original', value: text.slice(0, 1024) },
        { name: '📤 Translated', value: translated.slice(0, 1024) }
      )
      .setFooter({ text: `Powered by ${provider}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
