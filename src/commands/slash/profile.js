const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your game-style profile card')
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
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate level and XP (gamification)
      const level = Math.floor(Math.pow(userStats.messages.total / 100, 1/1.5));
      const currentLevelXP = Math.pow(level, 1.5) * 100;
      const nextLevelXP = Math.pow(level + 1, 1.5) * 100;
      const xpProgress = userStats.messages.total - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = Math.round((xpProgress / xpNeeded) * 100);
      
      // Create progress bar
      const barLength = 20;
      const filledBars = Math.round((progressPercent / 100) * barLength);
      const emptyBars = barLength - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      const memberDays = Math.max(1, Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24)));
      const percentile = leaderboardRank ? getPercentile(leaderboardRank.rank) : '0';
      
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `${targetUser.username}'s Profile`, 
          iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(getActivityColorHex(activityLevel.name))
        .addFields(
          {
            name: `${activityLevel.emoji} Level ${level} - ${activityLevel.name}`,
            value: `\`\`\`${progressBar}\`\`\`\n**${Math.round(xpProgress).toLocaleString()} / ${Math.round(xpNeeded).toLocaleString()} XP** (${progressPercent}%)`,
            inline: false
          },
          {
            name: '📊 Message Stats',
            value: 
              `**Total:** ${userStats.messages.total.toLocaleString()}\n` +
              `**Monthly:** ${userStats.messages.monthly.toLocaleString()}\n` +
              `**Weekly:** ${userStats.messages.weekly.toLocaleString()}\n` +
              `**Daily:** ${userStats.messages.daily.toLocaleString()}`,
            inline: true
          },
          {
            name: '🏆 Rankings',
            value: 
              `**Rank:** #${leaderboardRank?.rank || 'N/A'}\n` +
              `**Percentile:** Top ${percentile}%\n` +
              `**Voice:** ${Math.round(userStats.voiceTime / 60)}h\n` +
              `**Giveaways:** ${userStats.giveawaysWon || 0} won`,
            inline: true
          },
          {
            name: '📅 Member Info',
            value: 
              `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
              `**Days:** ${memberDays}\n` +
              `**Last Active:** <t:${Math.floor(userStats.lastMessageDate.getTime() / 1000)}:R>`,
            inline: true
          }
        )
        .setFooter({ 
          text: `User ID: ${targetUser.id} • Keep chatting to level up!`,
          iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in profile command:', error);
      await interaction.editReply('❌ Error generating profile card.');
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
    'Super Active': '#ff4444',
    'Very Active': '#ff8800',
    'Active': '#ffaa00',
    'Regular': '#00ff88',
    'Occasional': '#00aaff',
    'Newcomer': '#aaaaaa'
  };
  return colors[levelName] || '#ffffff';
}

function getPercentile(rank) {
  if (rank <= 10) return ((10 - rank + 1) * 10).toFixed(0);
  return Math.max(1, 100 - rank).toFixed(0);
}
