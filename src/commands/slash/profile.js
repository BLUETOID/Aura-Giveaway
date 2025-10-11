const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const canvasGenerator = require('../../utils/canvasGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your server profile card')
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
      
      await interaction.editReply({ files: [attachment] });
      
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
    'Super Active': 0xff4444,
    'Very Active': 0xff8800,
    'Active': 0xffaa00,
    'Regular': 0x00ff88,
    'Occasional': 0x00aaff,
    'Newcomer': 0xaaaaaa
  };
  return colors[levelName] || 0xffffff;
}
