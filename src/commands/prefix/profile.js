const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  name: 'profile',
  description: 'View your game-style profile card',
  usage: 'profile [@user]',
  aliases: ['card', 'rank'],

  async execute(message, args, { statsManager }) {
    try {
      let targetUser = message.author;
      
      // Check if a user was mentioned
      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
      } else if (args.length > 0) {
        try {
          targetUser = await message.client.users.fetch(args[0]);
        } catch (error) {
          return message.reply('❌ Could not find that user.');
        }
      }

      const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return message.reply(`❌ User ${targetUser.username} is not in this server.`);
      }

      const userStats = await statsManager.getUserProfile(message.guild.id, targetUser.id);
      
      if (!userStats || userStats.messages.total === 0) {
        return message.reply(`❌ No data found for ${targetUser.username}. They may not have sent any messages yet.`);
      }

      const loadingMsg = await message.reply('🎨 Generating profile card...');

      const leaderboardRank = await statsManager.getUserLeaderboardRank(message.guild.id, targetUser.id);
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate level and XP
      const level = Math.floor(Math.pow(userStats.messages.total / 100, 1/1.5));
      const currentLevelXP = Math.pow(level, 1.5) * 100;
      const nextLevelXP = Math.pow(level + 1, 1.5) * 100;
      const xpProgress = userStats.messages.total - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = (xpProgress / xpNeeded) * 100;
      
      // Generate profile card
      const canvas = createCanvas(900, 450);
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 900, 450);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(0.5, '#764ba2');
      gradient.addColorStop(1, '#f093fb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 900, 450);

      // Add pattern overlay
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 10; j++) {
          ctx.fillStyle = i % 2 === j % 2 ? '#ffffff' : '#000000';
          ctx.fillRect(i * 45, j * 45, 45, 45);
        }
      }
      ctx.globalAlpha = 1.0;

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 900, 450);

      // Main card container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      roundRect(ctx, 20, 20, 860, 410, 20);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      roundRect(ctx, 20, 20, 860, 410, 20);
      ctx.stroke();

      // Load and draw avatar
      try {
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(130, 150, 85, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 150, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 55, 75, 150, 150);
        ctx.restore();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(130, 150, 75, 0, Math.PI * 2);
        ctx.stroke();
      } catch (error) {
        console.error('Error loading avatar:', error);
      }

      // Username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(targetUser.username, 250, 100);

      // Activity Level
      ctx.fillStyle = getActivityColor(activityLevel.name);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${activityLevel.emoji} ${activityLevel.name}`, 250, 140);

      // Level Badge
      const levelBadgeX = 750;
      const levelBadgeY = 80;
      
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(levelBadgeX, levelBadgeY, 120, 60);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.strokeRect(levelBadgeX, levelBadgeY, 120, 60);
      
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('LEVEL', levelBadgeX + 30, levelBadgeY + 25);
      ctx.font = 'bold 28px Arial';
      ctx.fillText(level.toString(), levelBadgeX + 45, levelBadgeY + 50);

      // Stats Section
      const statsY = 200;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      
      ctx.fillText('📊 MESSAGES', 60, statsY);
      ctx.font = '18px Arial';
      ctx.fillText(`Total: ${userStats.messages.total.toLocaleString()}`, 60, statsY + 30);
      ctx.fillText(`Monthly: ${userStats.messages.monthly.toLocaleString()}`, 60, statsY + 55);
      ctx.fillText(`Weekly: ${userStats.messages.weekly.toLocaleString()}`, 60, statsY + 80);

      ctx.font = 'bold 20px Arial';
      ctx.fillText('🏆 RANK', 300, statsY);
      ctx.font = '18px Arial';
      ctx.fillText(`#${leaderboardRank?.rank || 'N/A'}`, 300, statsY + 30);
      ctx.fillText(`Top ${getPercentile(leaderboardRank?.rank || 0)}%`, 300, statsY + 55);

      ctx.font = 'bold 20px Arial';
      ctx.fillText('🎁 GIVEAWAYS', 500, statsY);
      ctx.font = '18px Arial';
      ctx.fillText(`Entered: ${userStats.giveawaysEntered || 0}`, 500, statsY + 30);
      ctx.fillText(`Won: ${userStats.giveawaysWon || 0}`, 500, statsY + 55);

      ctx.font = 'bold 20px Arial';
      ctx.fillText('🎤 VOICE', 720, statsY);
      ctx.font = '18px Arial';
      ctx.fillText(`${Math.round(userStats.voiceTime / 60)}h`, 720, statsY + 30);

      // XP Progress Bar
      const barX = 60;
      const barY = 360;
      const barWidth = 780;
      const barHeight = 40;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      roundRect(ctx, barX, barY, barWidth, barHeight, 20);
      ctx.fill();

      const fillWidth = (barWidth - 10) * (progressPercent / 100);
      const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      progressGradient.addColorStop(0, '#4facfe');
      progressGradient.addColorStop(1, '#00f2fe');
      ctx.fillStyle = progressGradient;
      roundRect(ctx, barX + 5, barY + 5, fillWidth, barHeight - 10, 15);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(xpProgress)} / ${Math.round(xpNeeded)} XP`, barX + barWidth / 2, barY + 27);
      ctx.textAlign = 'left';

      // Footer
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`Server Member Since: ${new Date(member.joinedTimestamp).toLocaleDateString()}`, 60, 425);
      
      ctx.textAlign = 'right';
      ctx.fillText(`ID: ${targetUser.id}`, 840, 425);

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
      
      await loadingMsg.edit({ content: null, files: [attachment] });
      
    } catch (error) {
      console.error('Error in profile command:', error);
      await message.reply('❌ Error generating profile card.');
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

function getActivityColor(levelName) {
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

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
