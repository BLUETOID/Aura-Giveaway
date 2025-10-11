const { createCanvas, loadImage, registerFont } = require('canvas');

class CanvasGenerator {
  /**
   * Generate a clean profile card with white/gray/black theme
   */
  async generateProfileCard(userData) {
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Light gray
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Main card - White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    try {
      // Load and draw avatar
      const avatar = await loadImage(userData.avatarUrl);
      const avatarSize = 120;
      const avatarX = 50;
      const avatarY = 50;

      // Avatar border circle
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Clip and draw avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Username
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(userData.username, 200, 80);

      // Activity level
      ctx.fillStyle = '#666666';
      ctx.font = '20px sans-serif';
      ctx.fillText(`${userData.activityEmoji} ${userData.activityLevel}`, 200, 110);

      // Level badge
      ctx.fillStyle = '#333333';
      ctx.fillRect(200, 130, 150, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`LEVEL ${userData.level}`, 215, 157);

      // Stats section
      const statsY = 190;
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 16px sans-serif';
      
      // Message Rank
      ctx.fillText('💬 Message Rank', 50, statsY);
      ctx.font = '24px sans-serif';
      ctx.fillText(`#${userData.messageRank}`, 50, statsY + 30);

      // Voice Rank
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🎤 Voice Rank', 220, statsY);
      ctx.font = '24px sans-serif';
      ctx.fillText(`#${userData.voiceRank}`, 220, statsY + 30);

      // XP Progress
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('⭐ XP Progress', 390, statsY);
      ctx.font = '20px sans-serif';
      ctx.fillText(`${userData.progressPercent}%`, 390, statsY + 30);

      // Progress bar
      const barX = 400;
      const barY = 120;
      const barWidth = 350;
      const barHeight = 30;

      // Progress bar background
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar fill
      const fillWidth = (userData.progressPercent / 100) * barWidth;
      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Progress bar border
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // XP text
      ctx.fillStyle = '#666666';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${userData.xpProgress.toLocaleString()} / ${userData.xpNeeded.toLocaleString()} XP`, barX, barY - 8);

    } catch (error) {
      console.error('Error loading avatar:', error);
      // Draw fallback text if avatar fails
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(userData.username, 50, 80);
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate a simple activity chart with bars
   */
  async generateActivityCard(data) {
    const width = 1000;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Main card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Title
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(data.title, 50, 60);

    // Subtitle
    ctx.fillStyle = '#666666';
    ctx.font = '18px sans-serif';
    ctx.fillText(data.subtitle, 50, 90);

    // Stats boxes
    const statsY = 120;
    const boxWidth = 220;
    const boxHeight = 80;
    const gap = 20;

    // Total Messages
    this.drawStatBox(ctx, 50, statsY, boxWidth, boxHeight, '💬 Total Messages', data.totalMessages.toLocaleString());
    
    // Voice Hours
    this.drawStatBox(ctx, 50 + boxWidth + gap, statsY, boxWidth, boxHeight, '🎤 Voice Hours', data.totalVoice.toFixed(1) + 'h');
    
    // Peak Hour
    this.drawStatBox(ctx, 50 + (boxWidth + gap) * 2, statsY, boxWidth, boxHeight, '📊 Peak Hour', data.peakHour);
    
    // Active Members
    this.drawStatBox(ctx, 50 + (boxWidth + gap) * 3, statsY, boxWidth, boxHeight, '👥 Active Members', data.activeMembers.toString());

    // Chart area
    const chartX = 50;
    const chartY = 240;
    const chartWidth = width - 100;
    const chartHeight = 200;

    // Draw chart background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);

    // Draw bars
    const maxMessages = Math.max(...data.hourlyData.map(h => h.messages), 1);
    const barWidth = chartWidth / data.hourlyData.length - 4;
    
    data.hourlyData.forEach((hour, index) => {
      const barHeight = (hour.messages / maxMessages) * (chartHeight - 40);
      const x = chartX + (index * (chartWidth / data.hourlyData.length)) + 2;
      const y = chartY + chartHeight - barHeight - 20;

      // Draw bar
      ctx.fillStyle = '#333333';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw hour label
      ctx.fillStyle = '#666666';
      ctx.font = '12px sans-serif';
      ctx.save();
      ctx.translate(x + barWidth / 2, chartY + chartHeight - 5);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(hour.label, 0, 0);
      ctx.restore();
    });

    // Legend
    ctx.fillStyle = '#666666';
    ctx.font = '14px sans-serif';
    ctx.fillText('■ Messages', chartX, chartY - 10);

    return canvas.toBuffer('image/png');
  }

  /**
   * Helper to draw a stat box
   */
  drawStatBox(ctx, x, y, width, height, label, value) {
    // Box background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(x, y, width, height);
    
    // Box border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#666666';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, x + 10, y + 25);

    // Value
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(value, x + 10, y + 55);
  }
}

module.exports = new CanvasGenerator();
