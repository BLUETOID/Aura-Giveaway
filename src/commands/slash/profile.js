const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your server profile and statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to view profile for (defaults to yourself)')
        .setRequired(false)),

  async execute(interaction, { statsManager }) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    await interaction.deferReply();
    
    try {
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.editReply(`❌ User ${targetUser.username} is not in this server.`);
      }

      const userStats = await statsManager.getUserProfile(interaction.guild.id, targetUser.id);
      
      if (!userStats || userStats.messages.total === 0) {
        return interaction.editReply(`❌ No data found for ${targetUser.username}. They may not have sent any messages yet.`);
      }

      const leaderboardRank = await statsManager.getUserLeaderboardRank(interaction.guild.id, targetUser.id);
      const voiceRank = await statsManager.getUserVoiceRank(interaction.guild.id, targetUser.id);
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate level and XP (gamification)
      const level = Math.floor(Math.pow(userStats.messages.total / 100, 1/1.5));
      const currentLevelXP = Math.pow(level, 1.5) * 100;
      const nextLevelXP = Math.pow(level + 1, 1.5) * 100;
      const xpProgress = userStats.messages.total - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = Math.round((xpProgress / xpNeeded) * 100);
      
      // Create embed profile card
      const embed = new EmbedBuilder()
        .setColor(getActivityColorHex(activityLevel.name))
        .setTitle(`${activityLevel.emoji} ${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
        .addFields(
          { name: '📊 Level', value: `**${level}**`, inline: true },
          { name: '🎯 Activity', value: `${activityLevel.name}`, inline: true },
          { name: '⭐ XP Progress', value: `${progressPercent}%`, inline: true },
          { name: '💬 Message Rank', value: `#${leaderboardRank?.rank || 'N/A'}`, inline: true },
          { name: '🎤 Voice Rank', value: `#${voiceRank?.rank || 'N/A'}`, inline: true },
          { name: '📈 Total Messages', value: `${userStats.messages.total.toLocaleString()}`, inline: true },
          { name: '🔹 Experience', value: `${Math.round(xpProgress).toLocaleString()} / ${Math.round(xpNeeded).toLocaleString()} XP`, inline: false }
        )
        .setFooter({ text: `Gaming Aura • ${new Date().toLocaleDateString()}` })
        .setTimestamp();

      // Add progress bar
      const barLength = 20;
      const filledBars = Math.round((progressPercent / 100) * barLength);
      const emptyBars = barLength - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      embed.setDescription(`**XP Progress**\n\`${progressBar}\` ${progressPercent}%`);
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in profile command:', error);
      await interaction.editReply('❌ Error loading profile.');
    }
  },
};

function calculateActivityLevel(totalMessages) {
  if (totalMessages >= 10000) return { name: 'Super Active', emoji: '🔥' };
  if (totalMessages >= 5000) return { name: 'Very Active', emoji: '⚡' };
  if (totalMessages >= 2000) return { name: 'Active', emoji: '💪' };
  if (totalMessages >= 500) return { name: 'Regular', emoji: '📝' };
  if (totalMessages >= 100) return { name: 'Occasional', emoji: '👋' };
  return { name: 'Newcomer', emoji: '🌱' };
}

function getActivityColorHex(levelName) {
  const colors = {
    'Super Active': 0xff4444,
    'Very Active': 0xff8800,
    'Active': 0xffaa00,
    'Regular': 0x00ff88,
    'Occasional': 0x00aaff,
    'Newcomer': 0xaaaaaa
  };
  return colors[levelName] || 0xffffff;
}
