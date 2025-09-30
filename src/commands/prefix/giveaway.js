const { parseDuration } = require('../../utils/duration');
const { PermissionManager } = require('../../utils/permissions');

module.exports = {
  name: 'giveaway',
  description: 'Manage giveaways from prefix commands.',
  usage: 'giveaway <create|entries|cancel|reroll|list|addrole|removerole|listroles> ...\nExample: `giveaway create #channel 1h 3 Discord Nitro @role` (3 winners)',
  async execute(message, args, context) {
    const { manager } = context;
    const permissionManager = new PermissionManager();

    const hasPermission = await permissionManager.hasGiveawayPermission(message.member, message.guildId);
    if (!hasPermission) {
      await message.reply('You need the **Manage Server** permission or an allowed role to manage giveaways.');
      return;
    }

    const subcommand = (args.shift() || '').toLowerCase();

    switch (subcommand) {
      case 'create': {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await message.reply('Please mention a text channel for the giveaway.');
          return;
        }

        const roleRequirement = message.mentions.roles.first();
        const cleanedArgs = args.filter((token) => token !== `<#${channel.id}>` && (!roleRequirement || token !== `<@&${roleRequirement.id}>`));

        const durationInput = cleanedArgs.shift();
        if (!durationInput) {
          await message.reply('Please provide a duration (e.g. `1h`, `30m`, `1d12h`).');
          return;
        }

        const durationMs = parseDuration(durationInput);
        if (!durationMs) {
          await message.reply('That duration could not be parsed. Try formats like `30m`, `2h`, or `1d12h`.');
          return;
        }

        // Check if the first argument is a number (winner count)
        let winnerCount = 1;
        let prizeArgs = cleanedArgs;
        
        if (cleanedArgs.length > 0 && /^\d+$/.test(cleanedArgs[0])) {
          const count = parseInt(cleanedArgs[0]);
          if (count > 0 && count <= 50) { // Reasonable limit
            winnerCount = count;
            prizeArgs = cleanedArgs.slice(1);
          }
        }

        const prize = prizeArgs.join(' ').trim();
        if (!prize) {
          await message.reply('Please provide a prize description.');
          return;
        }

        try {
          const giveaway = await manager.createGiveaway({
            guildId: message.guildId,
            channelId: channel.id,
            prize,
            durationMs,
            hostId: message.author.id,
            requirements: roleRequirement ? { roleId: roleRequirement.id } : {},
            winnerCount
          });

          await message.reply(`Giveaway created in ${channel} for **${prize}**. Ends <t:${Math.floor(giveaway.endsAt / 1000)}:R>.`);
        } catch (error) {
          console.error('[Prefix Giveaway Command] Failed to create giveaway:', error);
          await message.reply('Unable to create the giveaway. Please check my permissions and try again.');
        }
        return;
      }

      case 'entries':
      case 'participants': {
        const identifier = args.shift();
        if (!identifier) {
          await message.reply('Please provide a giveaway ID or message link.');
          return;
        }

        const giveaway = manager.resolveGiveaway(identifier);
        if (!giveaway) {
          await message.reply('No giveaway found for that identifier.');
          return;
        }

        if (!giveaway.participants.length) {
          await message.reply(`No one has entered giveaway **${giveaway.prize || 'Unknown prize'}** yet.`);
          return;
        }

        // Only admins can see detailed participant list
        const isAdmin = manager.isAdmin(message.member);
        
        if (isAdmin) {
          const header = `Entries for **${giveaway.prize}** (Giveaway ID: ${giveaway.id}) — ${giveaway.participants.length} total:`;
          const ids = giveaway.participants.map((participantId, index) => `${index + 1}. <@${participantId}>`);
          const chunkSize = 20;
          const chunks = [];
          for (let i = 0; i < ids.length; i += chunkSize) {
            chunks.push(ids.slice(i, i + chunkSize).join('\n'));
          }

          await message.reply(`${header}\n${chunks.shift()}`);
          for (const chunk of chunks) {
            await message.channel.send(chunk);
          }
        } else {
          // Non-admins only get count
          await message.reply(`**${giveaway.prize}** (ID: ${giveaway.id}) has ${giveaway.participants.length} entries. Only administrators can view the participant list.`);
        }
        return;
      }

      case 'cancel': {
        const identifier = args.shift();
        if (!identifier) {
          await message.reply('Usage: `giveaway cancel <giveawayId|messageLink> [reason]`');
          return;
        }

        const reason = args.join(' ').trim() || null;

        try {
          const giveaway = await manager.cancelGiveaway(identifier, message.author.id, reason);
          await message.reply(`Giveaway **${giveaway.prize}** has been cancelled.${reason ? ` Reason: ${reason}` : ''}`);
        } catch (error) {
          await message.reply(error.message || 'Unable to cancel that giveaway.');
        }
        return;
      }

      case 'reroll': {
        const identifier = args.shift();
        if (!identifier) {
          await message.reply('Usage: `giveaway reroll <giveawayId|messageLink>`');
          return;
        }

        try {
          const winnerId = await manager.rerollGiveaway(identifier, message.author.id);
          await message.reply(`New winner selected: <@${winnerId}>`);
        } catch (error) {
          await message.reply(error.message || 'Unable to reroll that giveaway.');
        }
        return;
      }

      case 'list': {
        const statusInput = (args.shift() || '').toLowerCase();
        const statusConst = manager.constructor.STATUS || {};
        const validStatuses = new Set(Object.values(statusConst));

        const giveaways = manager.getAllGiveaways();
        if (!giveaways.length) {
          await message.reply('No giveaways have been recorded yet.');
          return;
        }

        let filtered = giveaways;
        if (statusInput && statusInput !== 'all') {
          if (!validStatuses.has(statusInput)) {
            await message.reply('Unknown status filter. Use `active`, `ended`, `cancelled`, or omit it.');
            return;
          }
          filtered = giveaways.filter((giveaway) => giveaway.status === statusInput);
          if (!filtered.length) {
            await message.reply(`No giveaways found with status **${statusInput}**.`);
            return;
          }
        }

        const statusLabel = {
          [manager.constructor.STATUS?.ACTIVE || 'active']: 'Active',
          [manager.constructor.STATUS?.ENDED || 'ended']: 'Ended',
          [manager.constructor.STATUS?.CANCELLED || 'cancelled']: 'Cancelled'
        };

        const lines = filtered
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .map((giveaway) => {
            const label = statusLabel[giveaway.status] || giveaway.status;
            const channelMention = giveaway.channelId ? `<#${giveaway.channelId}>` : 'Unknown channel';
            let timing;

            if (giveaway.status === 'active') {
              timing = giveaway.endsAt ? `Ends <t:${Math.floor(giveaway.endsAt / 1000)}:R>` : 'End time unknown';
            } else if (giveaway.status === 'ended') {
              timing = giveaway.endedAt ? `Ended <t:${Math.floor(giveaway.endedAt / 1000)}:R>` : 'Ended';
            } else if (giveaway.status === 'cancelled') {
              timing = giveaway.cancelledAt ? `Cancelled <t:${Math.floor(giveaway.cancelledAt / 1000)}:R>` : 'Cancelled';
            } else {
              timing = '';
            }

            let detail = '';
            if (giveaway.status === 'ended') {
              detail = giveaway.winnerIds?.length
                ? ` — Winners: ${giveaway.winnerIds.map((id) => `<@${id}>`).join(', ')}`
                : ' — No winners';
            } else if (giveaway.status === 'cancelled') {
              detail = giveaway.cancelReason ? ` — Reason: ${giveaway.cancelReason}` : '';
            }

            return `• [${label}] **${giveaway.prize || 'No prize set'}** in ${channelMention}${timing ? ` — ${timing}` : ''}${detail}`;
          });

        const chunks = [];
        let buffer = '';
        for (const line of lines) {
          if ((buffer + line + '\n').length > 1800) {
            chunks.push(buffer.trim());
            buffer = '';
          }
          buffer += `${line}\n`;
        }
        if (buffer.trim().length) {
          chunks.push(buffer.trim());
        }

        const firstChunk = chunks.shift();
        if (firstChunk) {
          await message.reply(firstChunk);
        }
        for (const chunk of chunks) {
          await message.channel.send(chunk);
        }
        return;
      }

      case 'addrole': {
        // Only admins can manage allowed roles
        if (!manager.isAdmin(message.member)) {
          await message.reply('You need the **Manage Server** permission to manage allowed roles.');
          return;
        }

        const role = message.mentions.roles.first();
        if (!role) {
          await message.reply('Please mention a role to add to the allowed list.');
          return;
        }

        try {
          await permissionManager.addAllowedRole(message.guildId, role.id);
          await message.reply(`Added ${role} to the allowed roles list. Members with this role can now manage giveaways.`);
        } catch (error) {
          console.error('Error adding allowed role:', error);
          await message.reply('An error occurred while adding the role.');
        }
        return;
      }

      case 'removerole': {
        // Only admins can manage allowed roles
        if (!manager.isAdmin(message.member)) {
          await message.reply('You need the **Manage Server** permission to manage allowed roles.');
          return;
        }

        const role = message.mentions.roles.first();
        if (!role) {
          await message.reply('Please mention a role to remove from the allowed list.');
          return;
        }

        try {
          await permissionManager.removeAllowedRole(message.guildId, role.id);
          await message.reply(`Removed ${role} from the allowed roles list.`);
        } catch (error) {
          console.error('Error removing allowed role:', error);
          await message.reply('An error occurred while removing the role.');
        }
        return;
      }

      case 'listroles': {
        // Only admins can view allowed roles
        if (!manager.isAdmin(message.member)) {
          await message.reply('You need the **Manage Server** permission to view allowed roles.');
          return;
        }

        try {
          const allowedRoles = await permissionManager.getAllowedRoles(message.guildId);
          if (allowedRoles.length === 0) {
            await message.reply('No roles are currently allowed to manage giveaways. Only users with **Manage Server** permission can use giveaway commands.');
            return;
          }

          const roleList = allowedRoles.map(roleId => `<@&${roleId}>`).join('\n');
          await message.reply(`**Allowed roles for giveaway management:**\n${roleList}`);
        } catch (error) {
          console.error('Error listing allowed roles:', error);
          await message.reply('An error occurred while listing allowed roles.');
        }
        return;
      }

      default: {
        await message.reply('Available subcommands: `create`, `entries`, `cancel`, `reroll`, `list`, `addrole`, `removerole`, `listroles`.');
      }
    }
  }
};
