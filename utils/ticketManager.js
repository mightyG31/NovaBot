const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

/**
 * Team Nova Automated Ticket & Recruitment Handler
 */

function createTicketPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x00ffbb)
    .setTitle('📜 Team Nova • Official Ticket & Tryout Hub')
    .setDescription(
      `Welcome to **Team Nova**! Click a button below to open a private ticket with our leadership team.\n\n` +
      `⚔️ **Apply for Team Nova**: Start your official competitive tryout.\n` +
      `💡 **Plugin & Suggestions**: Suggest powers/abilities for the Team Nova custom plugin.\n` +
      `❓ **General Help**: Inquiries regarding scrims, events, or partnerships.`
    )
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3063/3063822.png')
    .setFooter({ text: 'Team Nova Automated Ticket System • 24/7 Enforcer' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_ticket_apply')
      .setLabel('Apply for Team Nova ⚔️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_ticket_suggest')
      .setLabel('Plugin Suggestion 💡')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_ticket_help')
      .setLabel('General Support ❓')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function handleTicketButtonClick(interaction) {
  const { guild, user, member, customId } = interaction;
  if (!guild) return;

  const typeMap = {
    btn_ticket_apply: { name: 'apply', title: '⚔️ Team Nova Tryout Application' },
    btn_ticket_suggest: { name: 'suggest', title: '💡 Team Nova Plugin Suggestion' },
    btn_ticket_help: { name: 'help', title: '❓ Team Nova Support Ticket' },
  };

  const ticketType = typeMap[customId] || { name: 'ticket', title: '📜 Team Nova Ticket' };
  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
  const channelName = `${ticketType.name}-${cleanUsername}`;

  // Check if user already has an active ticket channel
  const existing = guild.channels.cache.find((c) => c.name === channelName);
  if (existing) {
    await interaction.reply({
      content: `⚠️ You already have an open ticket in ${existing}!`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const parentCategory = interaction.channel?.parentId || undefined;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategory,
      topic: `Ticket for ${user.tag} (${user.id}) • Type: ${ticketType.title}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: guild.client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
      ],
    });

    // Initial greeting in the ticket
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00ffaa)
      .setTitle(ticketType.title)
      .setDescription(
        `Namaste <@${user.id}>! Your ticket has been created.\n\n` +
        `**Please answer the following questions to help us process your request faster:**\n` +
        (customId === 'btn_ticket_apply'
          ? `1. **Minecraft IGN**?\n` +
            `2. **Main PvP gamemodes & current tiers** (Nethpot, DiaSMP, Mace, CPvP)?\n` +
            `3. **Working microphone & active on Discord VC**? (Mandatory for Team Nova)\n` +
            `4. **Daily active playtime**?\n` +
            `5. **Previous SMP / Faction / Clan War experience**?`
          : `Please describe your suggestion or question in detail below. An authorized Nova Leader will review it shortly.`)
      )
      .setFooter({ text: 'Click [Close Ticket] below when resolved.' })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_ticket_close')
        .setLabel('Close Ticket 🔒')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@${user.id}> | <@&${guild.ownerId}>`,
      embeds: [welcomeEmbed],
      components: [closeRow],
    });

    await interaction.editReply({
      content: `✅ Your ticket has been created: ${ticketChannel}!`,
    });
  } catch (err) {
    console.error('[Ticket Create Error]:', err.message);
    await interaction.editReply({
      content: `⚠️ Failed to create ticket channel: ${err.message}`,
    });
  }
}

async function handleTicketClose(interaction) {
  const { channel, member, user } = interaction;
  if (!channel || !channel.name.includes('ticket-') && !channel.name.includes('apply-') && !channel.name.includes('suggest-') && !channel.name.includes('help-')) {
    await interaction.reply({
      content: '⚠️ This channel does not appear to be an active ticket.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `🔒 **Ticket is being closed and deleted by ${member?.displayName || user.username} in 5 seconds...**`,
  });

  setTimeout(async () => {
    try {
      await channel.delete('Ticket closed');
    } catch (_) {}
  }, 5000);
}

module.exports = {
  createTicketPanelEmbed,
  handleTicketButtonClick,
  handleTicketClose,
};
