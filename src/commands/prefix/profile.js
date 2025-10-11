const { AttachmentBuilder } = require('discord.js');
const canvasGenerator = require('../../utils/canvasGenerator');

module.exports = {
  name: 'profile',
  aliases: ['card', 'rank'],
  description: 'View your server profile card',
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

    const loadingMsg = await message.reply('🎨 Generating profile card...');

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
      const voiceRank = await statsManager.getUserVoiceRank(message.guild.id, targetUser.id);
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate level and XP (gamification)
      const level = Math.floor(Math.pow(userStats.messages.total / 100, 1/1.5));
      const currentLevelXP = Math.pow(level, 1.5) * 100;
      const nextLevelXP = Math.pow(level + 1, 1.5) * 100;
      const xpProgress = userStats.messages.total - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = Math.round((xpProgress / xpNeeded) * 100);
      
      // Generate profile card image
      const imageBuffer = await canvasGenerator.generateProfileCard({
        username: targetUser.username,
        avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
        level: level,
        activityLevel: activityLevel.name,
        activityEmoji: activityLevel.emoji,
        xpProgress: Math.round(xpProgress),
        xpNeeded: Math.round(xpNeeded),
        progressPercent: progressPercent,
        messageRank: leaderboardRank?.rank || 'N/A',
        voiceRank: voiceRank?.rank || 'N/A'
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.png' });
      
      await loadingMsg.edit({ content: null, files: [attachment] });
      
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
