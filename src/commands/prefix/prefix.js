module.exports = {
  name: 'prefix',
  description: 'View or modify the command prefix (admins only).',
  usage: 'prefix show | prefix set <newPrefix>',
  async execute(message, args, context) {
    const { manager, settings } = context;

    if (!args.length) {
      await message.reply('Usage: `prefix show` or `prefix set <newPrefix>`');
      return;
    }

    if (!manager.isAdmin(message.member)) {
      await message.reply('You need the **Manage Server** permission to manage the prefix.');
      return;
    }

    const subcommand = args.shift().toLowerCase();

    if (subcommand === 'show') {
      const current = settings.getPrefix(message.guildId);
        await message.reply(`Current prefix: \`${current}\``);
      return;
    }

    if (subcommand === 'set') {
      const newPrefix = args.shift();
      if (!newPrefix) {
        await message.reply('Please provide a new prefix.');
        return;
      }

      try {
        const updated = settings.setPrefix(message.guildId, newPrefix);
          await message.reply(`Prefix updated to \`${updated}\``);
      } catch (error) {
        await message.reply(`Unable to update prefix: ${error.message}`);
      }
      return;
    }

    await message.reply('Unknown subcommand. Use `prefix show` or `prefix set <newPrefix>`.');
  }
};
