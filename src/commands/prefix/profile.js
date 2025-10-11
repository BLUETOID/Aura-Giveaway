const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'profile',
  aliases: ['card', 'rank'],
  description: 'View your game-style profile card',
  usage: '[user]',
  category: 'utility',

  async execute(message, args, { statsManager }) {
    // Get target user
    let targetUser = message.author;
    if (args.length > 0) {
      const mention = message.mentions.users.first();
      if (mention) {
        targetUser = mention;
      } else {
        const userId = args[0].replace(/[<@!>]/g, '');
        targetUser = await message.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
          return message.reply('❌ User not found.');
        }
      }
    }

    const loadingMsg = await message.reply('🎮 Loading profile...');

    try {
      const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return loadingMsg.edit(`❌ User ${targetUser.username} is not in this server.`);
      }

      const userStats = await statsManager.getUserProfile(message.guild.id, targetUser.id);
      
      if (!userStats || userStats.messages.total === 0) {
        return loadingMsg.edit(`❌ No data found for ${targetUser.username}. They may not have sent any messages yet.`);
      }

      const leaderboardRank = await statsManager.getUserLeaderboardRank(message.guild.id, targetUser.id);
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate level and XP (gamification)
      const level = Math.floor(Math.pow(userStats.messages.total / 100, 1/1.5));
      const currentLevelXP = Math.pow(level, 1.5) * 100;
      const nextLevelXP = Math.pow(level + 1, 1.5) * 100;
      const xpProgress = userStats.messages.total - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = (xpProgress / xpNeeded) * 100;
      
      // Create progress bar
      const barLength = 20;
      const filledBars = Math.round((progressPercent / 100) * barLength);
      const emptyBars = barLength - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

      const embed = new EmbedBuilder()
        .setColor(getActivityColorHex(activityLevel.name))
        .setAuthor({ 
          name: `${targetUser.username}'s Profile`, 
          iconURL: targetUser.displayAvatarURL() 
        })
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          { 
            name: '🏅 Level & Activity', 
            value: `**Level:** ${level}\n**Status:** ${activityLevel.emoji} ${activityLevel.name}`, 
            inline: true 
          },
          { 
            name: '🏆 Server Rank', 
            value: `**Rank:** #${leaderboardRank?.rank || 'N/A'}\n**Percentile:** Top ${getPercentile(leaderboardRank?.rank || 0)}%`, 
            inline: true 
          },
          { 
            name: '📊 Messages', 
            value: `**Total:** ${userStats.messages.total.toLocaleString()}\n**Monthly:** ${userStats.messages.monthly.toLocaleString()}\n**Weekly:** ${userStats.messages.weekly.toLocaleString()}`, 
            inline: true 
          },
          { 
            name: '🎁 Giveaways', 
            value: `**Entered:** ${userStats.giveawaysEntered || 0}\n**Won:** ${userStats.giveawaysWon || 0}`, 
            inline: true 
          },
          { 
            name: '🎤 Voice Time', 
            value: `${Math.round(userStats.voiceTime / 60)} hours`, 
            inline: true 
          },
          { 
            name: '\u200B', 
            value: '\u200B', 
            inline: true 
          },
          { 
            name: '⭐ XP Progress', 
            value: `\`\`\`${progressBar}\`\`\`${Math.round(xpProgress).toLocaleString()} / ${Math.round(xpNeeded).toLocaleString()} XP (${progressPercent.toFixed(1)}%)`, 
            inline: false 
          }
        )
        .setFooter({ text: `Member since ${new Date(member.joinedTimestamp).toLocaleDateString()} • ID: ${targetUser.id}` })
        .setTimestamp();

      await loadingMsg.edit({ content: null, embeds: [embed] });
      
    } catch (error) {
      console.error('Error in profile command:', error);
      await loadingMsg.edit('❌ Error generating profile.');
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

function getPercentile(rank) {
  if (rank <= 10) return ((10 - rank + 1) * 10).toFixed(0);
  return Math.max(1, 100 - rank).toFixed(0);
}
