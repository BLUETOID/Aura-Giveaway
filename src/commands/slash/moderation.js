const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to warn')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the warning')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to kick')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the kick')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to ban')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the ban')
            .setRequired(false))
        .addIntegerOption(option =>
          option
            .setName('delete_days')
            .setDescription('Delete messages from last X days (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to timeout')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 10m, 1h, 1d)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the timeout')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to remove timeout from')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('purge')
        .setDescription('Delete multiple messages')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Number of messages to delete (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true))
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Only delete messages from this user')
            .setRequired(false))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'warn':
        await handleWarn(interaction);
        break;
      case 'kick':
        await handleKick(interaction);
        break;
      case 'ban':
        await handleBan(interaction);
        break;
      case 'timeout':
        await handleTimeout(interaction);
        break;
      case 'untimeout':
        await handleUntimeout(interaction);
        break;
      case 'purge':
        await handlePurge(interaction);
        break;
    }
  },
};

async function handleWarn(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
  }

  if (member.id === interaction.user.id) {
    return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });
  }

  if (member.roles.highest.position >= interaction.member.roles.highest.position) {
    return interaction.reply({ content: 'You cannot warn this member due to role hierarchy.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('⚠️ Member Warned')
    .setDescription(`**${user.tag}** has been warned`)
    .addFields(
      { name: 'Warned By', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp();

  // Try to DM the user
  try {
    await user.send({
      embeds: [new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ You Have Been Warned')
        .setDescription(`You have been warned in **${interaction.guild.name}**`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp()]
    });
  } catch (error) {
    console.log('Could not DM user:', error.message);
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleKick(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
  }

  if (member.id === interaction.user.id) {
    return interaction.reply({ content: 'You cannot kick yourself.', ephemeral: true });
  }

  if (!member.kickable) {
    return interaction.reply({ content: 'I cannot kick this member.', ephemeral: true });
  }

  if (member.roles.highest.position >= interaction.member.roles.highest.position) {
    return interaction.reply({ content: 'You cannot kick this member due to role hierarchy.', ephemeral: true });
  }

  // Try to DM the user before kicking
  try {
    await user.send({
      embeds: [new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('👢 You Have Been Kicked')
        .setDescription(`You have been kicked from **${interaction.guild.name}**`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp()]
    });
  } catch (error) {
    console.log('Could not DM user:', error.message);
  }

  await member.kick(reason);

  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('👢 Member Kicked')
    .setDescription(`**${user.tag}** has been kicked`)
    .addFields(
      { name: 'Kicked By', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleBan(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (member) {
    if (member.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot ban yourself.', ephemeral: true });
    }

    if (!member.bannable) {
      return interaction.reply({ content: 'I cannot ban this member.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot ban this member due to role hierarchy.', ephemeral: true });
    }

    // Try to DM the user before banning
    try {
      await user.send({
        embeds: [new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🔨 You Have Been Banned')
          .setDescription(`You have been banned from **${interaction.guild.name}**`)
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp()]
      });
    } catch (error) {
      console.log('Could not DM user:', error.message);
    }
  }

  await interaction.guild.members.ban(user.id, { deleteMessageSeconds: deleteDays * 86400, reason });

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🔨 Member Banned')
    .setDescription(`**${user.tag}** has been banned`)
    .addFields(
      { name: 'Banned By', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp();

  if (deleteDays > 0) {
    embed.addFields({ name: 'Messages Deleted', value: `Last ${deleteDays} day(s)`, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleTimeout(interaction) {
  const user = interaction.options.getUser('user');
  const durationInput = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
  }

  if (member.id === interaction.user.id) {
    return interaction.reply({ content: 'You cannot timeout yourself.', ephemeral: true });
  }

  if (!member.moderatable) {
    return interaction.reply({ content: 'I cannot timeout this member.', ephemeral: true });
  }

  if (member.roles.highest.position >= interaction.member.roles.highest.position) {
    return interaction.reply({ content: 'You cannot timeout this member due to role hierarchy.', ephemeral: true });
  }

  // Parse duration
  const ms = require('ms');
  const duration = ms(durationInput);
  
  if (!duration || duration < 1000 || duration > 2419200000) { // Max 28 days
    return interaction.reply({ content: 'Invalid duration. Use formats like `10m`, `1h`, `1d`. Max: 28 days.', ephemeral: true });
  }

  await member.timeout(duration, reason);

  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔇 Member Timed Out')
    .setDescription(`**${user.tag}** has been timed out`)
    .addFields(
      { name: 'Timed Out By', value: `${interaction.user.tag}`, inline: true },
      { name: 'Duration', value: ms(duration, { long: true }), inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUntimeout(interaction) {
  const user = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
  }

  if (!member.isCommunicationDisabled()) {
    return interaction.reply({ content: 'This member is not timed out.', ephemeral: true });
  }

  await member.timeout(null);

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🔊 Timeout Removed')
    .setDescription(`**${user.tag}**'s timeout has been removed`)
    .addFields({ name: 'Removed By', value: `${interaction.user.tag}`, inline: true })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handlePurge(interaction) {
  const amount = interaction.options.getInteger('amount');
  const targetUser = interaction.options.getUser('user');

  await interaction.deferReply({ ephemeral: true });

  try {
    let messages = await interaction.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });

    if (targetUser) {
      messages = messages.filter(msg => msg.author.id === targetUser.id);
    }

    // Remove the command message itself
    messages = messages.filter(msg => msg.id !== interaction.id);

    const deleted = await interaction.channel.bulkDelete(messages, true);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🧹 Messages Purged')
      .setDescription(`Successfully deleted ${deleted.size} message(s)`)
      .addFields({ name: 'Purged By', value: `${interaction.user.tag}`, inline: true })
      .setTimestamp();

    if (targetUser) {
      embed.addFields({ name: 'User Filter', value: `${targetUser.tag}`, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error purging messages:', error);
    await interaction.editReply({ content: 'An error occurred while trying to delete messages. Make sure the messages are not older than 14 days.' });
  }
}
