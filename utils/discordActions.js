const { PermissionsBitField, ChannelType } = require('discord.js');
const { createTicketPanelEmbed, handleTicketClose } = require('./ticketManager');
const { fetchPlayerTiers, createTierEmbed } = require('./tiersManager');
const { addReminder, parseDurationString } = require('./reminderManager');
const { startGiveaway } = require('./embedBuilderHelper');

/**
 * Executes server moderation & management actions requested by authorized users in natural chat.
 * Checks bot permissions and caller permissions before executing.
 */

function isHigherRoleOrOwner(member) {
  if (!member) return false;
  // 1. Technical Guild Owner
  if (member.id && member.guild?.ownerId && member.id === member.guild.ownerId) return true;

  // 2. Discord Administrator Permission
  if (member.permissions?.has && member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  // 3. Explicit Administrator or Owner Role
  const cache = member.roles?.cache;
  if (!cache) return false;

  const roleValues = typeof cache.values === 'function' ? Array.from(cache.values()) : Array.isArray(cache) ? cache : [];
  return roleValues.some((r) =>
    /^(administrator|admin|owner|co-owner|head\s*admin)$/i.test(r.name?.trim() || '')
  );
}

/**
 * Helper to resolve a user/member from a mention, snowflake ID, or username
 */
async function resolveMemberOrUser(guild, rawInput = '') {
  if (!guild || !rawInput) return { user: null, member: null };
  const cleanInput = rawInput.trim();

  // 1. Check for mention or numeric snowflake ID
  const idMatch = cleanInput.match(/\d{17,20}/);
  if (idMatch) {
    const id = idMatch[0];
    const member = await guild.members.fetch(id).catch(() => null);
    if (member) return { user: member.user, member };
    const user = await guild.client.users.fetch(id).catch(() => null);
    if (user) return { user, member: null };
  }

  // 2. Search by username or display name in guild cache
  const cleanName = cleanInput.replace(/^@/, '').toLowerCase();
  let foundMember = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === cleanName ||
      m.displayName.toLowerCase() === cleanName ||
      m.user.tag.toLowerCase() === cleanName
  );

  if (!foundMember) {
    // Search guild members via Discord API query
    try {
      const searched = await guild.members.search({ query: cleanName, limit: 1 });
      foundMember = searched.first() || null;
    } catch (_) {}
  }

  if (foundMember) {
    return { user: foundMember.user, member: foundMember };
  }

  return { user: null, member: null };
}

async function executeServerAction({ action, params, guild, channel, requesterMember, botMember, isCommanderAuthorized = false }) {
  if (!guild || !action) {
    return { success: false, message: 'Invalid guild or action specified.' };
  }

  // STRICT AUTHORITY PROTOCOL:
  // Directly accepts command ONLY from Owner or someone that Owner has explicitly authorized!
  if (!isCommanderAuthorized) {
    return {
      success: false,
      unauthorized: true,
      message: 'I need permission from the owner or someone that owner has authorized to be able to give command to me.',
    };
  }

  try {
    switch (action) {
      case 'create_channel': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
          return { success: false, message: 'I do not have Manage Channels permission.' };
        }
        let rawName = params.name || 'new-channel';
        rawName = rawName.replace(/^[#\s]+/, '').trim();
        const isVoice = params.type === 'voice';
        const created = await guild.channels.create({
          name: rawName,
          type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
          topic: params.topic || '',
          parent: channel?.parentId || undefined,
        });
        return {
          success: true,
          message: `Created ${isVoice ? 'voice' : 'text'} channel <#${created.id}>!`,
        };
      }

      case 'delete_channel': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
          return { success: false, message: 'I do not have Manage Channels permission.' };
        }
        const targetId = (params.channelId || '').replace(/[<#>]/g, '').trim();
        let targetChan = targetId ? guild.channels.cache.get(targetId) : channel;
        if (!targetChan && targetId) {
          targetChan = guild.channels.cache.find((c) => c.name.toLowerCase() === targetId.toLowerCase());
        }
        if (!targetChan) return { success: false, message: 'Channel not found.' };
        const name = targetChan.name;
        await targetChan.delete(params.reason || `Deleted by ${requesterMember?.displayName || 'Authorized Commander'}`);
        return { success: true, message: `Deleted channel #${name}.` };
      }

      case 'send_dm': {
        const { user: targetUser } = await resolveMemberOrUser(guild, params.userId);
        if (!targetUser) return { success: false, message: `Could not find user "${params.userId}".` };
        const dmText = params.message || 'Hello from Team Nova!';
        await targetUser.send(dmText);
        return {
          success: true,
          message: `Sent direct DM to ${targetUser.tag}: "${dmText.slice(0, 50)}..."`,
        };
      }

      case 'purge': {
        if (!botMember.permissionsIn(channel).has(PermissionsBitField.Flags.ManageMessages)) {
          return { success: false, message: 'I do not have Manage Messages permission in this channel.' };
        }
        const count = Math.min(Math.max(parseInt(params.amount || '5', 10), 1), 100);
        const deleted = await channel.bulkDelete(count, true);
        return {
          success: true,
          message: `Purged ${deleted.size} messages from #${channel.name}.`,
          count: deleted.size,
        };
      }

      case 'timeout': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
          return { success: false, message: 'I do not have Moderate Members permission.' };
        }
        const { member: target } = await resolveMemberOrUser(guild, params.userId);
        if (!target) return { success: false, message: `Could not find member "${params.userId}".` };
        if (target.id === guild.ownerId || isHigherRoleOrOwner(target)) {
          return { success: false, message: 'Cannot timeout a higher role / Nova / Owner member.' };
        }
        const mins = Math.max(parseInt(params.durationMinutes || '5', 10), 1);
        await target.timeout(mins * 60 * 1000, params.reason || `Timed out by ${requesterMember?.displayName || 'Authorized Commander'}`);
        return {
          success: true,
          message: `Timed out ${target.user.tag} for ${mins} minute(s). Reason: ${params.reason || 'No reason provided'}.`,
        };
      }

      case 'kick': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
          return { success: false, message: 'I do not have Kick Members permission.' };
        }
        const { member: target } = await resolveMemberOrUser(guild, params.userId);
        if (!target) return { success: false, message: `Could not find member "${params.userId}".` };
        if (target.id === guild.ownerId || isHigherRoleOrOwner(target)) {
          return { success: false, message: 'Cannot kick a higher role / Nova / Owner member.' };
        }
        await target.kick(params.reason || `Kicked by ${requesterMember?.displayName || 'Authorized Commander'}`);
        return {
          success: true,
          message: `Kicked ${target.user.tag}. Reason: ${params.reason || 'No reason provided'}.`,
        };
      }

      case 'ban': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          return { success: false, message: 'I do not have Ban Members permission.' };
        }
        const { user: targetUser } = await resolveMemberOrUser(guild, params.userId);
        if (!targetUser) return { success: false, message: `Could not find user "${params.userId}".` };
        if (targetUser.id === guild.ownerId) {
          return { success: false, message: 'Cannot ban the server owner.' };
        }
        await guild.members.ban(targetUser.id, {
          reason: params.reason || `Banned by ${requesterMember?.displayName || 'Authorized Commander'}`,
        });
        return {
          success: true,
          message: `Banned ${targetUser.tag}. Reason: ${params.reason || 'No reason provided'}.`,
        };
      }

      case 'role_add': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return { success: false, message: 'I do not have Manage Roles permission.' };
        }
        const { member: target } = await resolveMemberOrUser(guild, params.userId);
        if (!target) return { success: false, message: `Could not find member "${params.userId}".` };
        const roleName = (params.role || '').toLowerCase();
        const role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
        if (!role) return { success: false, message: `Role "${params.role}" not found in server.` };
        await target.roles.add(role);
        return { success: true, message: `Gave ${role.name} role to ${target.user.tag}.` };
      }

      case 'role_remove': {
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return { success: false, message: 'I do not have Manage Roles permission.' };
        }
        const { member: target } = await resolveMemberOrUser(guild, params.userId);
        if (!target) return { success: false, message: `Could not find member "${params.userId}".` };
        const roleName = (params.role || '').toLowerCase();
        const role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
        if (!role) return { success: false, message: `Role "${params.role}" not found in server.` };
        await target.roles.remove(role);
        return { success: true, message: `Removed ${role.name} role from ${target.user.tag}.` };
      }

      case 'bot_command': {
        const rawCmd = params.command || params.cmd || '';
        if (!rawCmd) return { success: false, message: 'No command specified to run.' };
        await channel.send(rawCmd);
        return {
          success: true,
          message: `Sent bot command: \`${rawCmd}\``,
        };
      }

      case 'ticket_setup': {
        const panel = createTicketPanelEmbed();
        await channel.send(panel);
        return {
          success: true,
          message: 'Official Team Nova ticket hub deployed to channel!',
        };
      }

      case 'ticket_close': {
        await handleTicketClose({
          channel,
          member: requesterMember,
          user: requesterMember?.user || { username: 'Leader' },
          reply: async (p) => channel.send(p),
        });
        return {
          success: true,
          message: 'Closing and archiving ticket channel...',
        };
      }

      case 'check_tiers': {
        const username = params.username || params.name || params.user || '';
        if (!username) return { success: false, message: 'No username specified to check tiers.' };
        const data = await fetchPlayerTiers(username);
        const embed = createTierEmbed(data);
        await channel.send({ embeds: [embed] });
        return {
          success: true,
          message: `Fetched competitive tiers for **${data.profile.username || username}**!`,
        };
      }

      case 'remind': {
        const timeStr = params.time || '10m';
        const durationMs = parseDurationString(timeStr) || 10 * 60 * 1000;
        const msg = params.message || 'Scheduled reminder';
        const pingTarget = params.ping || `<@${requesterMember?.id}>`;
        addReminder({
          guildId: guild.id,
          channelId: channel.id,
          authorId: requesterMember?.id,
          authorName: requesterMember?.displayName || 'Commander',
          message: msg,
          durationMs,
          pingTarget,
        });
        return {
          success: true,
          message: `Scheduled reminder for ${pingTarget} in ${timeStr}: "${msg}"`,
        };
      }

      case 'giveaway': {
        const prize = params.prize || 'VIP Rank';
        const durationMinutes = parseInt(params.duration || '10', 10) || 10;
        await startGiveaway({
          channel,
          prize,
          durationMinutes,
          hostName: requesterMember?.displayName || 'Server Commander',
          client: guild.client,
        });
        return {
          success: true,
          message: `Started giveaway for **${prize}** (${durationMinutes}m)!`,
        };
      }

      default:
        return { success: false, message: `Unknown server action: ${action}` };
    }
  } catch (err) {
    return { success: false, message: `Action failed: ${err.message}` };
  }
}

module.exports = {
  isHigherRoleOrOwner,
  resolveMemberOrUser,
  executeServerAction,
};
