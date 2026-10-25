const { EmbedBuilder } = require('discord.js');

// Active giveaways tracking
const activeGiveaways = new Map();

function createCustomEmbed({
  title,
  description,
  color = 0x5865f2,
  fields = [],
  footer,
  author,
  imageUrl,
  thumbnailUrl,
}) {
  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields && fields.length > 0) embed.addFields(fields);
  if (footer) embed.setFooter({ text: footer });
  if (author) embed.setAuthor(author);
  if (imageUrl) embed.setImage(imageUrl);
  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  embed.setTimestamp();
  return embed;
}

function parseEmbedCommand(text = '') {
  // Pattern: "novabot embed <title> | <description> | <colorHex>"
  const match = text.match(/novabot\s+embed\s+([^|]+)(?:\|\s*([^|]+))?(?:\|\s*(#?[0-9a-fA-F]{6}))?/i);
  if (!match) return null;

  return {
    title: match[1].trim(),
    description: match[2]?.trim() || '',
    color: match[3]?.trim() ? parseInt(match[3].replace('#', ''), 16) : 0x5865f2,
  };
}

function parseAnnouncementCommand(text = '') {
  // Pattern: "novabot announce <title> | <content>" or "oi novabot announce <content>"
  const match = text.match(/(?:oi\s+)?novabot\s+(?:announce|announcement)\s+([^|]+)(?:\|\s*(.+))?/i);
  if (!match) return null;

  if (match[2]) {
    return { title: match[1].trim(), content: match[2].trim() };
  }
  return { title: '📢 Team Nova Announcement', content: match[1].trim() };
}

function parseGiveawayCommand(text = '') {
  // Pattern: "novabot giveaway <prize> | <durationMinutes>"
  const match = text.match(/(?:oi\s+)?novabot\s+giveaway\s+([^|]+)\|\s*(\d+)/i);
  if (!match) return null;

  return {
    prize: match[1].trim(),
    durationMinutes: parseInt(match[2].trim(), 10) || 5,
  };
}

async function startGiveaway({ channel, prize, durationMinutes, hostName, client }) {
  const durationMs = durationMinutes * 60 * 1000;
  const endsAt = new Date(Date.now() + durationMs);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🎉 GIVEAWAY: ${prize}`)
    .setDescription(
      `React with 🎉 to enter!\n\n**Hosted by:** ${hostName}\n**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>`
    )
    .setFooter({ text: 'Team Nova Official Giveaway' })
    .setTimestamp(endsAt);

  const giveawayMsg = await channel.send({ embeds: [embed] });
  await giveawayMsg.react('🎉');

  setTimeout(async () => {
    try {
      const fetchedMsg = await channel.messages.fetch(giveawayMsg.id);
      const reaction = fetchedMsg.reactions.cache.get('🎉');
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const validUsers = Array.from(users.values()).filter((u) => !u.bot);

      if (validUsers.length === 0) {
        await channel.send(`🎉 Giveaway for **${prize}** ended! No valid entries.`);
        return;
      }

      const winner = validUsers[Math.floor(Math.random() * validUsers.length)];
      const winEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`🎉 GIVEAWAY ENDED!`)
        .setDescription(`Winner of **${prize}**: ${winner}!\n*Congratulations!*`)
        .setTimestamp();

      await channel.send({ content: `Congratulations ${winner}!`, embeds: [winEmbed] });
    } catch (err) {
      console.error('[Giveaway Error]:', err.message);
    }
  }, durationMs);

  return giveawayMsg;
}

module.exports = {
  createCustomEmbed,
  parseEmbedCommand,
  parseAnnouncementCommand,
  parseGiveawayCommand,
  startGiveaway,
};
