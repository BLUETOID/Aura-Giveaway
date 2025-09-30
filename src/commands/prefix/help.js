const { PermissionManager } = require('../../utils/permissions');

module.exports = {
  name: 'help',
  description: 'Show all admin commands for the giveaway bot.',
  usage: 'help',
  async execute(message, _args, context) {
    const { manager, prefix } = context;
    const permissionManager = new PermissionManager();

    const hasPermission = await permissionManager.hasGiveawayPermission(message.member, message.guildId);
    if (!hasPermission) {
      await message.reply('You need the **Manage Server** permission or an allowed role to view these commands.');
      return;
    }

    const lines = [
  '**Giveaway Bot Commands**',
  '',
  `• \`${prefix}giveaway create #channel <duration> [winners] <prize> [@role]\` - Start a giveaway`,
  `• \`${prefix}giveaway entries <giveawayId|messageLink>\` - View entry count (admins see full list)`,
  `• \`${prefix}giveaway cancel <giveawayId|messageLink> [reason]\` - Cancel an active giveaway`,
  `• \`${prefix}giveaway reroll <giveawayId|messageLink>\` - Select an additional winner`,
  `• \`${prefix}giveaway list [status]\` - List giveaways by status`,
  `• \`${prefix}giveaway addrole @role\` - Allow a role to manage giveaways`,
  `• \`${prefix}giveaway removerole @role\` - Remove role from allowed list`,
  `• \`${prefix}giveaway listroles\` - Show all allowed roles`,
  `• \`${prefix}prefix show\` - Display the current prefix`,
  `• \`${prefix}prefix set <newPrefix>\` - Change the command prefix`,
  `• \`${prefix}help\` - Show this list`,
  '',
  '**Examples:**',
  `• \`${prefix}giveaway create #general 1h 3 Discord Nitro\` (3 winners)`,
  `• \`${prefix}giveaway create #general 30m Steam Game @members\` (role required)`
    ];

    await message.reply(lines.join('\n'));
  }
};
