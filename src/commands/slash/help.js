const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all admin commands for the giveaway bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { manager, prefix } = context;

    if (!manager.isAdmin(interaction.member)) {
      await interaction.reply({ content: 'You need the **Manage Server** permission to view these commands.', ephemeral: true });
      return;
    }

    const lines = [
  '**Giveaway Bot Commands**',
  '',
  'Slash commands:',
  `• \`/giveaway create\` — Create a giveaway`,
  `• \`/giveaway entries\` — View entrants`,
  `• \`/giveaway cancel\` — Cancel an active giveaway`,
  `• \`/giveaway reroll\` — Select an additional winner`,
  `• \`/giveaway list\` — List giveaways (optional status filter)`,
  `• \`/prefix set\` — Change prefix`,
  `• \`/prefix show\` — Show prefix`,
  `• \`/help\` — Show this list`,
  '',
  'Prefix commands:',
  `• \`${prefix}giveaway create #channel <duration> <prize> [@role]\``,
  `• \`${prefix}giveaway entries <giveawayId|messageLink>\``,
  `• \`${prefix}giveaway cancel <giveawayId|messageLink> [reason]\``,
  `• \`${prefix}giveaway reroll <giveawayId|messageLink>\``,
  `• \`${prefix}giveaway list [status]\``,
  `• \`${prefix}prefix set <newPrefix>\``,
  `• \`${prefix}prefix show\``
    ];

    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
  }
};
