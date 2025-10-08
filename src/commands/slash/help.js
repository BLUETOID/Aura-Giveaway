const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all bot commands with pagination'),

  async execute(interaction) {
    const pages = createHelpPages(interaction.client.guilds.cache.first()?.id);
    let currentPage = 0;

    const embed = pages[currentPage];
    const row = createNavigationButtons(currentPage, pages.length);

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'These buttons are not for you!', ephemeral: true });
      }

      if (i.customId === 'help_previous') {
        currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
      } else if (i.customId === 'help_next') {
        currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
      } else if (i.customId === 'help_first') {
        currentPage = 0;
      } else if (i.customId === 'help_last') {
        currentPage = pages.length - 1;
      }

      await i.update({ embeds: [pages[currentPage]], components: [createNavigationButtons(currentPage, pages.length)] });
    });

    collector.on('end', () => {
      const disabledRow = createNavigationButtons(currentPage, pages.length, true);
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};

function createHelpPages(guildId) {
  const pages = [];

  // Page 1: Giveaway Commands
  pages.push(new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎉 Giveaway Commands')
    .setDescription('Manage giveaways on your server')
    .addFields(
      { 
        name: '`/giveaway create`', 
        value: 'Create a new giveaway with customizable duration and winners\n**Options:** channel, duration, winners, prize, role (optional)', 
        inline: false 
      },
      { 
        name: '`/giveaway entries`', 
        value: 'View participant count and list (admins see full list)\n**Options:** identifier (giveaway ID or message link)', 
        inline: false 
      },
      { 
        name: '`/giveaway cancel`', 
        value: 'Cancel an active giveaway\n**Options:** identifier, reason (optional)', 
        inline: false 
      },
      { 
        name: '`/giveaway reroll`', 
        value: 'Select an additional winner from an ended giveaway\n**Options:** identifier', 
        inline: false 
      },
      { 
        name: '`/giveaway list`', 
        value: 'List all giveaways with optional status filter\n**Options:** status (active/ended/cancelled)', 
        inline: false 
      }
    )
    .setFooter({ text: 'Page 1 of 4 • Use buttons below to navigate' })
    .setTimestamp());

  // Page 2: Moderation Commands
  pages.push(new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🛡️ Moderation Commands')
    .setDescription('Keep your server safe and organized')
    .addFields(
      { 
        name: '`/mod warn`', 
        value: 'Issue a warning to a member\n**Options:** user, reason (optional)', 
        inline: false 
      },
      { 
        name: '`/mod kick`', 
        value: 'Kick a member from the server\n**Options:** user, reason (optional)', 
        inline: false 
      },
      { 
        name: '`/mod ban`', 
        value: 'Ban a member from the server\n**Options:** user, reason (optional), delete_days (0-7)', 
        inline: false 
      },
      { 
        name: '`/mod timeout`', 
        value: 'Timeout a member for a specific duration\n**Options:** user, duration (e.g., 10m, 1h, 1d), reason (optional)', 
        inline: false 
      },
      { 
        name: '`/mod untimeout`', 
        value: 'Remove timeout from a member\n**Options:** user', 
        inline: false 
      },
      { 
        name: '`/mod purge`', 
        value: 'Delete multiple messages at once\n**Options:** amount (1-100), user (optional filter)', 
        inline: false 
      }
    )
    .setFooter({ text: 'Page 2 of 4 • Requires appropriate permissions' })
    .setTimestamp());

  // Page 3: Statistics Commands
  pages.push(new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('📊 Statistics Commands')
    .setDescription('Track and analyze server activity')
    .addFields(
      { 
        name: '`/stats overview`', 
        value: 'Quick snapshot of today\'s server statistics\nShows members, joins, leaves, messages, voice, and more', 
        inline: false 
      },
      { 
        name: '`/stats daily`', 
        value: 'Detailed breakdown of daily activity\nIncludes progress bars and hourly averages', 
        inline: false 
      },
      { 
        name: '`/stats weekly`', 
        value: 'Summary of the past 7 days\nShows trends and mini charts for all metrics', 
        inline: false 
      },
      { 
        name: '`/stats members`', 
        value: 'Member growth and retention statistics\nDay-by-day breakdown with growth rate analysis', 
        inline: false 
      },
      { 
        name: '`/stats activity`', 
        value: 'Server engagement metrics\nMessage activity, voice usage, role changes, and online peaks', 
        inline: false 
      }
    )
    .setFooter({ text: 'Page 3 of 5 • Statistics update in real-time' })
    .setTimestamp());

  // Page 4: Utility Commands
  pages.push(new EmbedBuilder()
    .setColor('#00D9FF')
    .setTitle('⚙️ Utility Commands')
    .setDescription('Bot configuration and information')
    .addFields(
      { 
        name: '`/ping`', 
        value: 'Check bot\'s latency and status\nShows API latency, message latency, and server count', 
        inline: false 
      },
      { 
        name: '`/prefix set`', 
        value: 'Change the command prefix for this server\n**Options:** new_prefix (e.g., !, ?, .)', 
        inline: false 
      },
      { 
        name: '`/prefix show`', 
        value: 'Display the current command prefix for this server', 
        inline: false 
      },
      { 
        name: '`/help`', 
        value: 'Show this help menu with all available commands', 
        inline: false 
      }
    )
    .setFooter({ text: 'Page 4 of 5 • Use buttons below to navigate' })
    .setTimestamp());

  // Page 5: Features & Tips
  pages.push(new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('✨ Features & Tips')
    .setDescription('Learn how to get the most out of this bot')
    .addFields(
      { 
        name: '🎯 Giveaway Entry', 
        value: 'Users react with 🎉 to enter giveaways\nAdmins can view and manage participants via the **Participants** button', 
        inline: false 
      },
      { 
        name: '🔒 Role Requirements', 
        value: 'Create giveaways that require specific roles\nOnly users with the role can participate', 
        inline: false 
      },
      { 
        name: '🏆 Multiple Winners', 
        value: 'Set multiple winners when creating giveaways\nBot automatically selects unique winners', 
        inline: false 
      },
      { 
        name: '� Statistics Tracking', 
        value: 'Automatic tracking of server metrics\n30-day data retention with daily resets at midnight UTC', 
        inline: false 
      },
      { 
        name: '� Data Persistence', 
        value: 'All data stored securely on GitHub\nGiveaways cleaned up after 7 days, statistics after 30 days', 
        inline: false 
      },
      { 
        name: '� Permissions', 
        value: 'Giveaway/Stats: **Manage Server** • Moderation: **Moderate Members**\nEnsure bot has: Manage Messages, Add Reactions, Moderate Members', 
        inline: false 
      }
    )
    .setFooter({ text: 'Page 5 of 5 • Thanks for using Aura Utility Bot!' })
    .setTimestamp());

  return pages;
}

function createNavigationButtons(currentPage, totalPages, disabled = false) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_first')
        .setLabel('⏮️ First')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || currentPage === 0),
      new ButtonBuilder()
        .setCustomId('help_previous')
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('help_page_indicator')
        .setLabel(`${currentPage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('help_last')
        .setLabel('Last ⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || currentPage === totalPages - 1)
    );
}
