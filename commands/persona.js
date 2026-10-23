const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('persona')
    .setDescription('NovaBot uses a unified dynamic brain that adapts automatically!'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🧠 Unified Adaptive Brain Active')
      .setDescription(
        'NovaBot has unified all persona modes into a single, seamless humanlike brain:\n\n' +
        '• **Chill Buddy**: Relaxed, witty banter during casual chats.\n' +
        '• **Hype Gamer**: Elevates energy for PvP clutches, grinding, and scrims.\n' +
        '• **Reverence for Leaders**: Respects Owners, Admins, and Nova higher roles as bosses & kings.\n' +
        '• **Defense Mode (Routiney Style)**: Unleashes savage Nepali/English curses & roasts on anyone disrespecting our higher-ups.\n' +
        '• **Server Enforcer**: Executes moderation & server tasks when authorized.\n\n' +
        '*NovaBot figures out what is needed in real time without manual mode toggling!*'
      );

    await interaction.reply({ embeds: [embed] });
  },
};
