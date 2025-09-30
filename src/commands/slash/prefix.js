const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the command prefix.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('show')
        .setDescription('Display the current command prefix.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Update the command prefix for this guild.')
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('New prefix (max 5 characters).')
            .setRequired(true)
        )
    ),

  async execute(interaction, context) {
    const { manager, settings } = context;

    if (!manager.isAdmin(interaction.member)) {
      await interaction.reply({ content: 'You need the **Manage Server** permission to manage the prefix.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'show') {
      const current = settings.getPrefix(interaction.guildId);
      await interaction.reply({ content: `Current prefix: \`${current}\``, ephemeral: true });
      return;
    }

    if (subcommand === 'set') {
      const value = interaction.options.getString('value', true);
      try {
        const updated = settings.setPrefix(interaction.guildId, value);
        await interaction.reply({ content: `Prefix updated to \`${updated}\``, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: `Unable to update prefix: ${error.message}`, ephemeral: true });
      }
      return;
    }

    await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
};
