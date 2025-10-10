const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show all bot commands with pagination',
  usage: 'help',
  async execute(message, _args, context) {
    const { prefix } = context;
    
    const pages = createHelpPages(prefix);
    let currentPage = 0;

    const embed = pages[currentPage];
    const row = createNavigationButtons(currentPage, pages.length);

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
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
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};

function createHelpPages(prefix) {
  const pages = [];

  // Page 1: Giveaway Commands
  pages.push(new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎉 Giveaway Commands')
    .setDescription('Manage giveaways on your server')
    .addFields(
      { 
        name: `\`${prefix}giveaway create\``, 
        value: `Create a new giveaway\n**Usage:** \`${prefix}giveaway create #channel <duration> [winners] <prize> [@role]\`\n**Example:** \`${prefix}giveaway create #general 1h 3 Discord Nitro\`\n**Note:** Use slash command \`/giveaway create\` for message requirements`, 
        inline: false 
      },
      { 
        name: `\`${prefix}giveaway entries\``, 
        value: `View participants in a giveaway\n**Usage:** \`${prefix}giveaway entries <giveawayId|messageLink>\``, 
        inline: false 
      },
      { 
        name: `\`${prefix}giveaway cancel\``, 
        value: `Cancel an active giveaway\n**Usage:** \`${prefix}giveaway cancel <giveawayId|messageLink> [reason]\``, 
        inline: false 
      },
      { 
        name: `\`${prefix}giveaway reroll\``, 
        value: `Select an additional winner\n**Usage:** \`${prefix}giveaway reroll <giveawayId|messageLink>\``, 
        inline: false 
      },
      { 
        name: `\`${prefix}giveaway list\``, 
        value: `List all giveaways\n**Usage:** \`${prefix}giveaway list [status]\`\n**Status:** active, ended, cancelled`, 
        inline: false 
      }
    )
    .setFooter({ text: `Page 1 of 4 • Current prefix: ${prefix}` })
    .setTimestamp());

  // Page 2: Statistics Commands
  pages.push(new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('📊 Statistics Commands')
    .setDescription('Track and analyze server activity')
    .addFields(
      { 
        name: `\`${prefix}stats overview\``, 
        value: 'Quick snapshot of today\'s server statistics', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats daily\``, 
        value: 'Detailed breakdown of daily activity', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats weekly\``, 
        value: 'Summary of the past 7 days with trends', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats monthly\``, 
        value: 'Overview of the past 30 days with charts', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats members\``, 
        value: 'Member growth and retention statistics', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats activity\``, 
        value: 'Server engagement metrics and charts', 
        inline: false 
      },
      { 
        name: `\`${prefix}stats leaderboard\``, 
        value: `Top message senders on the server\n**Usage:** \`${prefix}stats leaderboard [period] [limit]\`\n**Periods:** total, daily, weekly, monthly (default: total)\n**Limit:** 1-25 users (default: 10)\n**Example:** \`${prefix}stats leaderboard weekly 15\``, 
        inline: false 
      }
    )
    .setFooter({ text: `Page 2 of 4 • Current prefix: ${prefix}` })
    .setTimestamp());

  // Page 3: Utility Commands
  pages.push(new EmbedBuilder()
    .setColor('#00D9FF')
    .setTitle('⚙️ Utility Commands')
    .setDescription('Bot configuration and information')
    .addFields(
      { 
        name: `\`${prefix}ping\``, 
        value: 'Check bot\'s latency and status', 
        inline: false 
      },
      { 
        name: `\`${prefix}prefix set\``, 
        value: `Change the command prefix\n**Usage:** \`${prefix}prefix set <newPrefix>\`\n**Example:** \`${prefix}prefix set ?\``, 
        inline: false 
      },
      { 
        name: `\`${prefix}prefix show\``, 
        value: 'Display the current command prefix', 
        inline: false 
      },
      { 
        name: `\`${prefix}help\``, 
        value: 'Show this help menu', 
        inline: false 
      }
    )
    .addFields(
      { 
        name: '💡 Slash Commands Available', 
        value: 'Use `/help` to see slash command versions with more features!\nSlash commands include `/mod` for moderation and `/stats` for statistics.', 
        inline: false 
      }
    )
    .setFooter({ text: `Page 3 of 4 • Current prefix: ${prefix}` })
    .setTimestamp());

  // Page 4: Features & Tips
  pages.push(new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('✨ Features & Tips')
    .setDescription('Learn how to get the most out of this bot')
    .addFields(
      { 
        name: '🎯 Giveaway Entry', 
        value: 'Users react with 🎉 to enter giveaways\nAdmins can view and manage participants', 
        inline: false 
      },
      { 
        name: '🔒 Role Requirements', 
        value: 'Add a role requirement when creating giveaways\nOnly users with that role can participate', 
        inline: false 
      },
      { 
        name: '🏆 Multiple Winners', 
        value: 'Specify number of winners when creating\nBot automatically selects unique winners', 
        inline: false 
      },
      { 
        name: '💬 Message Requirements', 
        value: 'Set minimum message count for giveaway entry (slash command only)\nRequires users to be active before participating', 
        inline: false 
      },
      { 
        name: '⏱️ Live Countdown Timer', 
        value: 'Giveaway embeds update automatically every 60 seconds\nShows remaining time until the giveaway ends', 
        inline: false 
      },
      { 
        name: '📊 Statistics Tracking', 
        value: 'Automatic tracking of joins, leaves, messages, voice\nUser messages tracked: total, daily, weekly, monthly', 
        inline: false 
      },
      { 
        name: '🏅 Message Leaderboards', 
        value: 'View top message senders by total, daily, weekly, or monthly\nTrack active members and engagement levels', 
        inline: false 
      },
      { 
        name: '🔄 Counter Resets', 
        value: 'Daily: Midnight UTC • Weekly: Monday midnight UTC • Monthly: 1st midnight UTC\n**Total message count never resets** - only period counters', 
        inline: false 
      },
      { 
        name: '💾 Data Persistence', 
        value: 'All data stored in MongoDB Atlas automatically\nGiveaways: 7 days, Statistics: 30 days', 
        inline: false 
      },
      { 
        name: '🎮 Duration Formats', 
        value: '`10m` = 10 minutes\n`2h` = 2 hours\n`1d` = 1 day\n`1d12h` = 1 day 12 hours', 
        inline: false 
      }
    )
    .setFooter({ text: `Page 4 of 4 • Current prefix: ${prefix}` })
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
