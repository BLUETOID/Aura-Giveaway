const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { parseDuration } = require('../../utils/duration');
const { PermissionManager } = require('../../utils/permissions');

const STATUS_CHOICES = [
  { name: 'Active', value: 'active' },
  { name: 'Ended', value: 'ended' },
  { name: 'Cancelled', value: 'cancelled' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways in this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new giveaway in a selected channel.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel where the giveaway should be hosted.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('duration')
            .setDescription('How long the giveaway should run (e.g. 30m, 2h, 1d12h).')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('prize')
            .setDescription('Prize or reward for the giveaway winner.')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('required_role')
            .setDescription('Role required to enter the giveaway (optional).')
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('winners')
            .setDescription('Number of winners to select (default: 1, max: 50).')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('entries')
        .setDescription('List all users who have entered a giveaway.')
        .addStringOption((option) =>
          option
            .setName('identifier')
            .setDescription('Giveaway ID or message link.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel an active giveaway.')
        .addStringOption((option) =>
          option
            .setName('identifier')
            .setDescription('Giveaway ID or message link.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Reason for cancelling the giveaway.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reroll')
        .setDescription('Select a new winner for an ended giveaway.')
        .addStringOption((option) =>
          option
            .setName('identifier')
            .setDescription('Giveaway ID or message link.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List giveaways and their status.')
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('Filter giveaways by status.')
            .setRequired(false)
            .addChoices(...STATUS_CHOICES)
        )
    ),

  async execute(interaction, context) {
    const { manager } = context;
    const permissionManager = new PermissionManager();

    const hasPermission = await permissionManager.hasGiveawayPermission(interaction.member, interaction.guildId);
    if (!hasPermission) {
      await interaction.reply({ content: 'You need the **Manage Server** permission or an allowed role to manage giveaways.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create': {
        const channel = interaction.options.getChannel('channel');
        const durationInput = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const requiredRole = interaction.options.getRole('required_role');
        const winnerCount = interaction.options.getInteger('winners') || 1;

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({ content: 'Please choose a text-based channel.', ephemeral: true });
          return;
        }

        const durationMs = parseDuration(durationInput);
        if (!durationMs) {
          await interaction.reply({ content: 'That duration could not be parsed. Try formats like `30m`, `2h`, or `1d12h`.', ephemeral: true });
          return;
        }

        try {
          const giveaway = await manager.createGiveaway({
            guildId: interaction.guildId,
            channelId: channel.id,
            prize,
            durationMs,
            hostId: interaction.user.id,
            requirements: requiredRole ? { roleId: requiredRole.id } : {},
            winnerCount
          });

          await interaction.reply({
            content: `Giveaway created in ${channel} for **${prize}**. Ends <t:${Math.floor(giveaway.endsAt / 1000)}:R>.`,
            ephemeral: true
          });
        } catch (error) {
          console.error('[Slash Giveaway Command] Failed to create giveaway:', error);
          await interaction.reply({ content: 'Unable to create the giveaway. Please check my permissions and try again.', ephemeral: true });
        }
        return;
      }

      case 'entries': {
        const identifier = interaction.options.getString('identifier', true);
        const giveaway = manager.resolveGiveaway(identifier);

        if (!giveaway) {
          await interaction.reply({ content: 'No giveaway found for that identifier.', ephemeral: true });
          return;
        }

        if (!giveaway.participants.length) {
          await interaction.reply({ content: `No one has entered giveaway **${giveaway.prize || 'Unknown prize'}** yet.`, ephemeral: true });
          return;
        }

        // Only admins can see detailed participant list
        const isAdmin = manager.isAdmin(interaction.member);
        
        if (isAdmin) {
          const header = `Entries for **${giveaway.prize}** (Giveaway ID: ${giveaway.id}) — ${giveaway.participants.length} total:`;
          const ids = giveaway.participants.map((participantId, index) => `${index + 1}. <@${participantId}>`);
          const chunkSize = 20;
          const chunks = [];
          for (let i = 0; i < ids.length; i += chunkSize) {
            chunks.push(ids.slice(i, i + chunkSize).join('\n'));
          }

          const [first, ...rest] = chunks;
          await interaction.reply({ content: `${header}\n${first}`, ephemeral: true });
          for (const chunk of rest) {
            await interaction.followUp({ content: chunk, ephemeral: true });
          }
        } else {
          // Non-admins only get count
          await interaction.reply({ content: `**${giveaway.prize}** (ID: ${giveaway.id}) has ${giveaway.participants.length} entries. Only administrators can view the participant list.`, ephemeral: true });
        }
        return;
      }

      case 'cancel': {
        const identifier = interaction.options.getString('identifier', true);
        const reason = interaction.options.getString('reason');

        try {
          const giveaway = await manager.cancelGiveaway(identifier, interaction.user.id, reason ?? null);
          await interaction.reply({
            content: `Giveaway **${giveaway.prize}** has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
            ephemeral: true
          });
        } catch (error) {
          await interaction.reply({ content: error.message || 'Unable to cancel that giveaway.', ephemeral: true });
        }
        return;
      }

      case 'reroll': {
        const identifier = interaction.options.getString('identifier', true);

        try {
          const winnerId = await manager.rerollGiveaway(identifier, interaction.user.id);
          await interaction.reply({ content: `New winner selected: <@${winnerId}>`, ephemeral: true });
        } catch (error) {
          await interaction.reply({ content: error.message || 'Unable to reroll that giveaway.', ephemeral: true });
        }
        return;
      }

      case 'list': {
        const statusFilter = interaction.options.getString('status');
        const giveaways = manager.getAllGiveaways();

        if (!giveaways.length) {
          await interaction.reply({ content: 'No giveaways have been recorded yet.', ephemeral: true });
          return;
        }

        const filtered = statusFilter
          ? giveaways.filter((giveaway) => giveaway.status === statusFilter)
          : giveaways;

        if (!filtered.length) {
          await interaction.reply({ content: `No giveaways found with status **${statusFilter}**.`, ephemeral: true });
          return;
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
          await interaction.reply({ content: firstChunk, ephemeral: true });
        } else {
          await interaction.reply({ content: 'No giveaways found.', ephemeral: true });
        }
        for (const chunk of chunks) {
          await interaction.followUp({ content: chunk, ephemeral: true });
        }
        return;
      }

      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  }
};
