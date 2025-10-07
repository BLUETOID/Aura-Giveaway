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
        value: `Create a new giveaway\n**Usage:** \`${prefix}giveaway create #channel <duration> [winners] <prize> [@role]\`\n**Example:** \`${prefix}giveaway create #general 1h 3 Discord Nitro\``, 
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
    .setFooter({ text: `Page 1 of 3 • Current prefix: ${prefix}` })
    .setTimestamp());

  // Page 2: Utility Commands
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
        value: 'Use `/help` to see slash command versions with more features!\nSlash commands include `/mod` for moderation and more.', 
        inline: false 
      }
    )
    .setFooter({ text: `Page 2 of 3 • Current prefix: ${prefix}` })
    .setTimestamp());

  // Page 3: Features & Tips
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
        name: '💾 Data Persistence', 
        value: 'All giveaways are saved automatically\nOld giveaways (7+ days) are cleaned up', 
        inline: false 
      },
      { 
        name: '👥 Permissions', 
        value: 'Most commands require **Manage Server** permission\nEnsure bot has proper permissions too', 
        inline: false 
      },
      { 
        name: '🎮 Duration Formats', 
        value: '`10m` = 10 minutes\n`2h` = 2 hours\n`1d` = 1 day\n`1d12h` = 1 day 12 hours', 
        inline: false 
      }
    )
    .setFooter({ text: `Page 3 of 3 • Current prefix: ${prefix}` })
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
