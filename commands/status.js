const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  queryMinecraftServer,
  getAllConfiguredServersStatus,
} = require('../utils/gameStatus');
const { getGuildConfig } = require('../utils/contextManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check live game server status, online players, and ping!')
    .addStringOption((opt) =>
      opt
        .setName('address')
        .setDescription('Optional custom server IP/domain (e.g. play.hypixel.net or host:port)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const customAddr = interaction.options.getString('address');
    const guildId = interaction.guildId || 'default';
    const cfg = getGuildConfig(guildId);

    let statuses = [];
    if (customAddr) {
      const [host, portStr] = customAddr.trim().split(':');
      const port = portStr ? parseInt(portStr, 10) : 25565;
      const single = await queryMinecraftServer(host, port, host);
      statuses = [single];
    } else if (cfg.gameServers && cfg.gameServers.length > 0) {
      statuses = await getAllConfiguredServersStatus(cfg.gameServers);
    } else {
      return interaction.editReply({
        content:
          '⚠️ No default game server is configured yet! Pass an address with `/status address:play.example.com` or set your server default using `/config gameserver`.',
      });
    }

    const embeds = statuses.map((s) => {
      if (!s.online) {
        return new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🔴 ${s.name} — OFFLINE`)
          .setDescription(
            `Could not reach \`${s.host}:${s.port}\`.\n*Server bandha cha jasto cha sathi! (${s.error || 'Timeout'})*`
          )
          .setTimestamp();
      }

      const roster =
        s.playerNames && s.playerNames.length > 0
          ? s.playerNames.slice(0, 20).join(', ')
          : s.playersOnline > 0
          ? '*Players online (roster hidden by server)*'
          : '*Khali cha — be the first to join!*';

      return new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`🟢 ${s.name} — ONLINE`)
        .setDescription(
          s.motd ? `\`\`\`\n${s.motd}\n\`\`\`` : '*Server is online and ready to play!*'
        )
        .addFields(
          { name: '🌐 Address', value: `\`${s.host}:${s.port}\``, inline: true },
          {
            name: '👥 Players Online',
            value: `**${s.playersOnline}** / **${s.playersMax}**`,
            inline: true,
          },
          { name: '⚡ Latency & Version', value: `\`${s.latencyMs}ms\` • ${s.version}`, inline: true },
          { name: '🎮 Active Roster', value: roster }
        )
        .setFooter({ text: `Checked at ${s.checkedAt}` });
    });

    await interaction.editReply({ embeds });
  },
};
