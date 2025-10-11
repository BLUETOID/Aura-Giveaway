const { createCanvas, loadImage } = require('canvas');

class CanvasGenerator {
  /**
   * Generate a clean profile card with DARK theme (inverted colors)
   */
  async generateProfileCard(userData) {
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Dark gray
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Main card - Darker
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border - Gray
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    try {
      // Load and draw avatar
      const avatar = await loadImage(userData.avatarUrl);
      const avatarSize = 120;
      const avatarX = 50;
      const avatarY = 50;

      // Avatar border circle - White
      ctx.strokeStyle = '#ffffff';
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

      // Username - White
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(userData.username, 200, 80);

      // Activity level - Light gray
      ctx.fillStyle = '#cccccc';
      ctx.font = '20px sans-serif';
      ctx.fillText(`${userData.activityEmoji} ${userData.activityLevel}`, 200, 110);

      // Level badge
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(200, 130, 150, 40);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`LEVEL ${userData.level}`, 215, 157);

      // Stats section
      const statsY = 190;
      ctx.fillStyle = '#ffffff';
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

      // Progress bar background - Dark
      ctx.fillStyle = '#404040';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar fill - White
      const fillWidth = (userData.progressPercent / 100) * barWidth;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Progress bar border
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // XP text
      ctx.fillStyle = '#cccccc';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${userData.xpProgress.toLocaleString()} / ${userData.xpNeeded.toLocaleString()} XP`, barX, barY - 8);

    } catch (error) {
      console.error('Error loading avatar:', error);
      // Draw fallback text if avatar fails
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(userData.username, 50, 80);
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate overview stats summary image (text-based)
   */
  async generateOverviewStatsImage(data) {
    const width = 800;
    const height = 550;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('📊 Statistics Overview', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText("Today's server statistics", 50, 105);

    let y = 180;

    // Row 1: Members, Online, Date
    this.drawDarkStatBox(ctx, 50, y, 220, 90, '👥 Total Members', data.memberCount?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 300, y, 220, 90, '🟢 Online Now', data.onlineCount?.toString() || '0');
    this.drawDarkStatBox(ctx, 550, y, 200, 90, '📅 Peak Online', data.maxOnline?.toString() || '0');
    
    y += 110;

    // Row 2: Joins, Leaves, Messages
    this.drawDarkStatBox(ctx, 50, y, 220, 90, '📥 Joins Today', data.joins?.toString() || '0');
    this.drawDarkStatBox(ctx, 300, y, 220, 90, '📤 Leaves Today', data.leaves?.toString() || '0');
    this.drawDarkStatBox(ctx, 550, y, 200, 90, `${data.growthEmoji || '➖'} Net Growth`, (data.netGrowth > 0 ? '+' : '') + (data.netGrowth || 0));
    
    y += 110;

    // Row 3: Messages, Voice
    this.drawDarkStatBox(ctx, 50, y, 340, 90, '💬 Messages Sent', data.messages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 410, y, 340, 90, '🎤 Voice Activity', (data.voiceHours || '0') + ' hours');

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate daily stats summary image (text-based, replaces embed)
   */
  async generateDailyStatsImage(data) {
    const width = 900;
    const height = 650;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Main card - Dark gray
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('📅 Daily Statistics', 50, 70);

    // Date
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText(data.date || 'Today', 50, 105);

    // Row 1: Member Activity
    this.drawDarkStatBox(ctx, 50, 140, 250, 110, '📥 Joins', data.joins?.toString() || '0');
    this.drawDarkStatBox(ctx, 325, 140, 250, 110, '📤 Leaves', data.leaves?.toString() || '0');
    this.drawDarkStatBox(ctx, 600, 140, 250, 110, '📊 Net Growth', `${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`);

    // Row 2: Online & Messages
    this.drawDarkStatBox(ctx, 50, 280, 250, 110, '🟢 Peak Online', data.peakOnline?.toString() || '0');
    this.drawDarkStatBox(ctx, 325, 280, 250, 110, '👤 Active Members', data.activeMembers?.toString() || 'N/A');
    this.drawDarkStatBox(ctx, 600, 280, 250, 110, '💬 Total Messages', data.messages?.toLocaleString() || '0');

    // Row 3: Message Details
    const avgMsgPerHour = Math.round((data.messages || 0) / 24);
    this.drawDarkStatBox(ctx, 50, 420, 250, 110, '⏱️ Avg/Hour', avgMsgPerHour.toString());
    
    const peakHour = data.peakHour || 'N/A';
    this.drawDarkStatBox(ctx, 325, 420, 250, 110, '📈 Peak Hour', peakHour);
    
    this.drawDarkStatBox(ctx, 600, 420, 250, 110, '🎤 Voice Hours', data.voiceHours?.toString() || '0');

    // Bottom info bar
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(50, 560, 800, 50);
    ctx.strokeStyle = '#404040';
    ctx.strokeRect(50, 560, 800, 50);
    
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px sans-serif';
    const engagementRate = data.activeMembers && data.peakOnline ? 
      ((data.activeMembers / data.peakOnline) * 100).toFixed(1) : '0';
    ctx.fillText(`📊 Engagement Rate: ${engagementRate}%`, 70, 593);
    
    ctx.fillStyle = '#999999';
    ctx.fillText('|', 400, 593);
    
    ctx.fillStyle = '#fbbf24';
    const activityLevel = data.messages > 500 ? 'High Activity' : data.messages > 100 ? 'Moderate' : 'Low Activity';
    ctx.fillText(`⚡ Activity: ${activityLevel}`, 430, 593);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate daily activity LINE GRAPH (not bar chart)
   */
  async generateDailyGraph(data) {
    return this.generateLineChart({
      title: 'Daily Activity - Last 24 Hours',
      subtitle: data.subtitle || 'Hourly Breakdown',
      stats: [
        { label: '💬 Messages', value: data.totalMessages?.toLocaleString() || '0' },
        { label: '🎤 Voice', value: (data.totalVoice?.toFixed(1) || '0') + 'h' },
        { label: '📊 Peak', value: data.peakHour || 'N/A' },
        { label: '👥 Active', value: data.activeMembers?.toString() || '0' }
      ],
      chartData: data.hourlyData || [],
      lines: [
        { dataKey: 'messages', color: '#ffffff', label: 'Messages' }
      ],
      labelKey: 'label'
    });
  }

  /**
   * Generate weekly stats summary image (text-based)
   */
  async generateWeeklyStatsImage(data) {
    const width = 900;
    const height = 650;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('📊 Weekly Statistics', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText('Last 7 Days • Comprehensive Overview', 50, 105);

    // Row 1: Member Growth
    this.drawDarkStatBox(ctx, 50, 140, 250, 110, '📥 Joins', data.totalJoins?.toString() || '0');
    ctx.fillStyle = '#4ade80';
    ctx.font = '16px sans-serif';
    ctx.fillText(`+${Math.round(data.totalJoins / 7)}/day`, 70, 235);

    this.drawDarkStatBox(ctx, 325, 140, 250, 110, '📤 Leaves', data.totalLeaves?.toString() || '0');
    ctx.fillStyle = '#f87171';
    ctx.font = '16px sans-serif';
    ctx.fillText(`-${Math.round(data.totalLeaves / 7)}/day`, 345, 235);

    this.drawDarkStatBox(ctx, 600, 140, 250, 110, '📊 Net Growth', `${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`);
    const growthPercentage = data.netGrowth > 0 ? '↗ Growing' : data.netGrowth < 0 ? '↘ Declining' : '→ Stable';
    ctx.fillStyle = data.netGrowth > 0 ? '#4ade80' : data.netGrowth < 0 ? '#f87171' : '#999999';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(growthPercentage, 620, 235);

    // Row 2: Messages
    this.drawDarkStatBox(ctx, 50, 280, 250, 110, '💬 Total Messages', data.totalMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 325, 280, 250, 110, '📈 Daily Average', data.avgMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 600, 280, 250, 110, '⚡ Peak Day', data.peakMessages?.toLocaleString() || '0');

    // Row 3: Voice & Online
    this.drawDarkStatBox(ctx, 50, 420, 250, 110, '🎤 Voice Hours', `${data.totalVoiceHours || '0'}h`);
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.avgVoiceHours || '0'}h/day avg`, 70, 515);

    this.drawDarkStatBox(ctx, 325, 420, 250, 110, '🟢 Peak Online', data.peakOnline?.toString() || '0');
    this.drawDarkStatBox(ctx, 600, 420, 250, 110, '📊 Avg Online', Math.round(data.avgOnline || 0).toString());

    // Bottom insights bar
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(50, 560, 800, 50);
    ctx.strokeStyle = '#404040';
    ctx.strokeRect(50, 560, 800, 50);
    
    const growthTrend = data.netGrowth > 20 ? '🚀 Excellent Growth' : 
                        data.netGrowth > 0 ? '📈 Positive Trend' : 
                        data.netGrowth === 0 ? '➖ Stable' : '📉 Needs Attention';
    const activityTrend = data.totalMessages > 3500 ? 'High Activity' : data.totalMessages > 700 ? 'Moderate Activity' : 'Low Activity';
    
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${growthTrend}`, 70, 593);
    
    ctx.fillStyle = '#999999';
    ctx.fillText('|', 400, 593);
    
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`⚡ ${activityTrend}`, 430, 593);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate weekly LINE GRAPH (7 days)
   */
  async generateWeeklyGraph(data) {
    return this.generateLineChart({
      title: 'Weekly Statistics - Last 7 Days',
      subtitle: data.subtitle || 'Daily Trends',
      stats: [
        { label: '📈 Avg Messages', value: data.avgMessages?.toLocaleString() || '0' },
        { label: '🎤 Avg Voice', value: (data.avgVoice?.toFixed(1) || '0') + 'h' },
        { label: '📊 Total', value: data.totalMessages?.toLocaleString() || '0' },
        { label: '🔥 Peak Day', value: data.peakDay || 'N/A' }
      ],
      chartData: data.dailyData || [],
      lines: [
        { dataKey: 'messages', color: '#ffffff', label: 'Messages' },
        { dataKey: 'voice', color: '#888888', label: 'Voice (hrs)' }
      ],
      labelKey: 'label'
    });
  }

  /**
   * Generate monthly stats summary image (text-based)
   */
  async generateMonthlyStatsImage(data) {
    const width = 900;
    const height = 650;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('📊 Monthly Statistics', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText('Last 30 Days • Complete Monthly Overview', 50, 105);

    // Row 1: Member Growth
    this.drawDarkStatBox(ctx, 50, 140, 250, 110, '📥 Total Joins', data.totalJoins?.toString() || '0');
    ctx.fillStyle = '#4ade80';
    ctx.font = '16px sans-serif';
    ctx.fillText(`+${Math.round(data.totalJoins / 30)}/day`, 70, 235);

    this.drawDarkStatBox(ctx, 325, 140, 250, 110, '📤 Total Leaves', data.totalLeaves?.toString() || '0');
    ctx.fillStyle = '#f87171';
    ctx.font = '16px sans-serif';
    ctx.fillText(`-${Math.round(data.totalLeaves / 30)}/day`, 345, 235);

    this.drawDarkStatBox(ctx, 600, 140, 250, 110, '📊 Net Growth', `${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`);
    const monthlyTrend = data.netGrowth > 50 ? '🚀 Excellent' : data.netGrowth > 0 ? '📈 Growing' : data.netGrowth === 0 ? '➖ Stable' : '📉 Declining';
    ctx.fillStyle = data.netGrowth > 0 ? '#4ade80' : data.netGrowth < 0 ? '#f87171' : '#999999';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(monthlyTrend, 620, 235);

    // Row 2: Messages
    this.drawDarkStatBox(ctx, 50, 280, 250, 110, '💬 Total Messages', data.totalMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 325, 280, 250, 110, '📈 Daily Average', data.avgMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 600, 280, 250, 110, '⚡ Peak Day', data.peakMessages?.toLocaleString() || '0');

    // Row 3: Voice & Activity
    this.drawDarkStatBox(ctx, 50, 420, 250, 110, '🎤 Voice Hours', `${data.totalVoiceHours || '0'}h`);
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.avgVoiceHours || '0'}h/day avg`, 70, 515);

    this.drawDarkStatBox(ctx, 325, 420, 250, 110, '🟢 Peak Online', data.peakOnline?.toString() || '0');
    
    const consistencyScore = data.totalMessages > 15000 ? '⭐ High' : data.totalMessages > 5000 ? '✓ Good' : '○ Fair';
    this.drawDarkStatBox(ctx, 600, 420, 250, 110, '📊 Consistency', consistencyScore);

    // Bottom insights bar
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(50, 560, 800, 50);
    ctx.strokeStyle = '#404040';
    ctx.strokeRect(50, 560, 800, 50);
    
    const projectedGrowth = Math.round((data.netGrowth / 30) * 365);
    const growthProjection = projectedGrowth > 0 ? `📈 Projected Annual Growth: +${projectedGrowth}` : 
                             projectedGrowth < 0 ? `📉 Projected Annual: ${projectedGrowth}` : '➖ Stable Trend';
    
    ctx.fillStyle = projectedGrowth > 0 ? '#4ade80' : projectedGrowth < 0 ? '#f87171' : '#999999';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(growthProjection, 70, 593);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate monthly LINE GRAPH (30 days)
   */
  async generateMonthlyGraph(data) {
    return this.generateLineChart({
      title: 'Monthly Statistics - Last 30 Days',
      subtitle: data.subtitle || 'Daily Activity',
      stats: [
        { label: '📊 Total Messages', value: data.totalMessages?.toLocaleString() || '0' },
        { label: '🎤 Total Voice', value: (data.totalVoice?.toFixed(0) || '0') + 'h' },
        { label: '📈 Daily Avg', value: data.avgMessages?.toLocaleString() || '0' },
        { label: '🔥 Best Day', value: data.bestDay || 'N/A' }
      ],
      chartData: data.dailyData || [],
      lines: [
        { dataKey: 'messages', color: '#ffffff', label: 'Messages' }
      ],
      labelKey: 'date'
    });
  }

  /**
   * Generate member stats summary image (text-based)
   */
  async generateMemberStatsImage(data) {
    const width = 900;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('👥 Member Growth Analytics', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText('Last 7 Days • Detailed Growth Metrics', 50, 105);

    // Row 1: Current Status
    this.drawDarkStatBox(ctx, 50, 140, 380, 110, '📊 Current Members', data.currentMembers?.toLocaleString() || '0');
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px sans-serif';
    const growthText = `${data.netGrowth > 0 ? '↗' : data.netGrowth < 0 ? '↘' : '→'} ${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0} (${data.growthRate || '0'}%)`;
    ctx.fillText(growthText, 70, 230);

    this.drawDarkStatBox(ctx, 470, 140, 380, 110, '📈 All-Time Statistics', '');
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total Joins: ${data.allTimeJoins?.toLocaleString() || '0'}`, 490, 210);
    ctx.fillText(`Total Leaves: ${data.allTimeLeaves?.toLocaleString() || '0'}`, 490, 235);

    // Row 2: Join Stats
    this.drawDarkStatBox(ctx, 50, 280, 250, 130, '📥 Total Joins', data.totalJoins?.toString() || '0');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Avg: ${data.avgJoins || 0}/day`, 70, 390);

    this.drawDarkStatBox(ctx, 325, 280, 250, 130, '🏆 Best Join Day', data.bestDay?.toString() || '0');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText('Peak performance', 345, 390);

    this.drawDarkStatBox(ctx, 600, 280, 250, 130, '📊 Join Rate', `${((data.totalJoins || 0) / 7).toFixed(1)}/day`);
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText('Weekly average', 620, 390);

    // Row 3: Leave Stats
    this.drawDarkStatBox(ctx, 50, 440, 250, 130, '📤 Total Leaves', data.totalLeaves?.toString() || '0');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Avg: ${data.avgLeaves || 0}/day`, 70, 550);

    this.drawDarkStatBox(ctx, 325, 440, 250, 130, '✨ Retention Rate', `${data.retention || '0'}%`);
    ctx.fillStyle = data.retention >= 80 ? '#4ade80' : data.retention >= 50 ? '#fbbf24' : '#f87171';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(data.retention >= 80 ? 'Excellent' : data.retention >= 50 ? 'Good' : 'Needs Attention', 345, 550);

    this.drawDarkStatBox(ctx, 600, 440, 250, 130, '⚖️ Growth Balance', '');
    const balance = ((data.totalJoins || 0) - (data.totalLeaves || 0));
    ctx.fillStyle = balance > 0 ? '#4ade80' : balance < 0 ? '#f87171' : '#999999';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${balance > 0 ? '+' : ''}${balance}`, 620, 510);
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText('Net this week', 620, 550);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate member growth LINE GRAPH
   */
  async generateMemberGraph(data) {
    return this.generateLineChart({
      title: 'Member Growth - Last 7 Days',
      subtitle: data.subtitle || 'Server Growth',
      stats: [
        { label: '👥 Total Members', value: data.currentMembers?.toLocaleString() || '0' },
        { label: '📈 Net Growth', value: (data.netGrowth > 0 ? '+' : '') + (data.netGrowth || 0) },
        { label: '📥 Joins', value: data.totalJoins?.toString() || '0' },
        { label: '📤 Leaves', value: data.totalLeaves?.toString() || '0' }
      ],
      chartData: data.dailyData || [],
      lines: [
        { dataKey: 'joins', color: '#4ade80', label: 'Joins' },
        { dataKey: 'leaves', color: '#f87171', label: 'Leaves' }
      ],
      labelKey: 'date'
    });
  }

  /**
   * Generate activity stats summary image (text-based)
   */
  async generateActivityStatsImage(data) {
    const width = 900;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('📈 Server Activity', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText('Comprehensive Activity Analysis', 50, 105);

    // Row 1: Message Stats
    this.drawDarkStatBox(ctx, 50, 150, 250, 110, '💬 Total Messages', data.totalMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 325, 150, 250, 110, '📊 Daily Average', data.avgMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 600, 150, 250, 110, '⏱️ Hourly Avg', data.hourlyAvg?.toString() || '0');

    // Row 2: Peak Stats
    this.drawDarkStatBox(ctx, 50, 290, 250, 110, '⚡ Peak Hour', data.peakHour || 'N/A');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.peakMessages || 0} msgs`, 70, 385);

    this.drawDarkStatBox(ctx, 325, 290, 250, 110, '📅 Peak Day', data.peakDay || 'N/A');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.peakDayMessages?.toLocaleString() || 0} msgs`, 345, 385);

    this.drawDarkStatBox(ctx, 600, 290, 250, 110, '👥 Active Members', data.activeMembers?.toString() || '0');

    // Row 3: Voice & Engagement
    this.drawDarkStatBox(ctx, 50, 430, 250, 110, '🎤 Voice Hours', `${data.totalVoiceHours || '0'}h`);
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.avgVoiceHours || '0'}h/day avg`, 70, 525);

    this.drawDarkStatBox(ctx, 325, 430, 250, 110, '🟢 Peak Online', data.peakOnline?.toString() || '0');
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${data.avgPeakOnline || 0} avg`, 345, 525);

    const engagementRate = data.activeMembers && data.peakOnline ? 
      ((data.activeMembers / data.peakOnline) * 100).toFixed(1) : '0';
    this.drawDarkStatBox(ctx, 600, 430, 250, 110, '📊 Engagement', `${engagementRate}%`);
    const engagementLevel = parseFloat(engagementRate) > 50 ? 'High' : parseFloat(engagementRate) > 25 ? 'Good' : 'Fair';
    ctx.fillStyle = parseFloat(engagementRate) > 50 ? '#4ade80' : parseFloat(engagementRate) > 25 ? '#fbbf24' : '#999999';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(engagementLevel, 620, 525);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate activity LINE GRAPH (not bar chart)
   */
  async generateActivityGraph(data) {
    return this.generateLineChart({
      title: 'Server Activity - Last 24 Hours',
      subtitle: data.subtitle || 'Hourly Breakdown',
      stats: [
        { label: '💬 Messages', value: data.totalMessages?.toLocaleString() || '0' },
        { label: '🎤 Voice Hours', value: (data.totalVoice?.toFixed(1) || '0') + 'h' },
        { label: '📊 Peak Hour', value: data.peakHour || 'N/A' },
        { label: '👥 Active Members', value: data.activeMembers?.toString() || '0' }
      ],
      chartData: data.hourlyData || [],
      lines: [
        { dataKey: 'messages', color: '#ffffff', label: 'Messages' }
      ],
      labelKey: 'label'
    });
  }

  /**
   * Generic bar chart generator
   */
  async generateBarChart(config) {
    const width = 1000;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Main card - Dark gray
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Title - White
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(config.title, 50, 60);

    // Subtitle - Gray
    ctx.fillStyle = '#999999';
    ctx.font = '18px sans-serif';
    ctx.fillText(config.subtitle, 50, 90);

    // Stats boxes
    const statsY = 120;
    const boxWidth = 220;
    const boxHeight = 80;
    const gap = 20;

    config.stats.forEach((stat, index) => {
      this.drawDarkStatBox(ctx, 50 + (boxWidth + gap) * index, statsY, boxWidth, boxHeight, stat.label, stat.value);
    });

    // Chart area
    const chartX = 50;
    const chartY = 240;
    const chartWidth = width - 100;
    const chartHeight = 200;

    // Draw chart background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
    ctx.strokeStyle = '#303030';
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);

    // Draw bars
    const maxValue = Math.max(...config.chartData.map(d => d[config.dataKey] || 0), 1);
    const barWidth = Math.max((chartWidth / config.chartData.length) - 4, 2);
    
    config.chartData.forEach((item, index) => {
      const value = item[config.dataKey] || 0;
      const barHeight = (value / maxValue) * (chartHeight - 40);
      const x = chartX + (index * (chartWidth / config.chartData.length)) + 2;
      const y = chartY + chartHeight - barHeight - 20;

      // Draw bar
      ctx.fillStyle = config.barColor;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw label (every few items to avoid overlap)
      if (config.chartData.length < 30 || index % 2 === 0) {
        ctx.fillStyle = '#888888';
        ctx.font = '11px sans-serif';
        ctx.save();
        ctx.translate(x + barWidth / 2, chartY + chartHeight - 5);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(item[config.labelKey] || '', 0, 0);
        ctx.restore();
      }
    });

    return canvas.toBuffer('image/png');
  }

  /**
   * Generic line chart generator
   */
  async generateLineChart(config) {
    const width = 1000;
    const height = 550;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Main card - Dark gray with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 20, 0, height - 20);
    bgGradient.addColorStop(0, '#1a1a1a');
    bgGradient.addColorStop(1, '#151515');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(20, 20, width - 40, height - 40);
    
    // Border with glow effect
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(config.title, 50, 65);

    // Subtitle
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText(config.subtitle, 50, 95);

    // Stats boxes
    const statsY = 130;
    const boxWidth = 220;
    const boxHeight = 80;
    const gap = 20;

    config.stats.forEach((stat, index) => {
      this.drawDarkStatBox(ctx, 50 + (boxWidth + gap) * index, statsY, boxWidth, boxHeight, stat.label, stat.value);
    });

    // Chart area
    const chartX = 60;
    const chartY = 250;
    const chartWidth = width - 120;
    const chartHeight = 240;

    // Draw chart background with subtle gradient
    const chartBg = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartHeight);
    chartBg.addColorStop(0, '#0f0f0f');
    chartBg.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = chartBg;
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
    ctx.strokeStyle = '#303030';
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);

    // Draw grid lines with labels
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666666';
    ctx.font = '12px sans-serif';
    
    for (let i = 0; i <= 5; i++) {
      const y = chartY + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();
    }

    // Draw each line with gradient fill and smooth curves
    config.lines.forEach(lineConfig => {
      const maxValue = Math.max(...config.chartData.map(d => d[lineConfig.dataKey] || 0), 1);
      const pointSpacing = chartWidth / (config.chartData.length - 1 || 1);

      // Draw gradient fill under line
      const gradient = ctx.createLinearGradient(0, chartY, 0, chartY + chartHeight);
      gradient.addColorStop(0, lineConfig.color + '40'); // 25% opacity
      gradient.addColorStop(1, lineConfig.color + '00'); // 0% opacity
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      config.chartData.forEach((item, index) => {
        const value = item[lineConfig.dataKey] || 0;
        const x = chartX + (index * pointSpacing);
        const y = chartY + chartHeight - ((value / maxValue) * (chartHeight - 20)) - 10;

        if (index === 0) {
          ctx.moveTo(x, chartY + chartHeight);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.lineTo(chartX + (config.chartData.length - 1) * pointSpacing, chartY + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw the line with glow effect
      ctx.shadowColor = lineConfig.color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = lineConfig.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      config.chartData.forEach((item, index) => {
        const value = item[lineConfig.dataKey] || 0;
        const x = chartX + (index * pointSpacing);
        const y = chartY + chartHeight - ((value / maxValue) * (chartHeight - 20)) - 10;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw points with glow
      ctx.fillStyle = lineConfig.color;
      ctx.shadowColor = lineConfig.color;
      ctx.shadowBlur = 8;
      
      config.chartData.forEach((item, index) => {
        const value = item[lineConfig.dataKey] || 0;
        const x = chartX + (index * pointSpacing);
        const y = chartY + chartHeight - ((value / maxValue) * (chartHeight - 20)) - 10;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner white dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = lineConfig.color;
      });
      
      ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw legend with better styling
    let legendX = chartX;
    config.lines.forEach((lineConfig, index) => {
      ctx.fillStyle = lineConfig.color;
      ctx.fillRect(legendX, chartY - 15, 15, 15);
      ctx.fillStyle = '#cccccc';
      ctx.font = '13px sans-serif';
      ctx.fillText(lineConfig.label, legendX + 20, chartY - 3);
      legendX += ctx.measureText(lineConfig.label).width + 50;
    });

    return canvas.toBuffer('image/png');
  }

  /**
   * Helper to draw a dark-themed stat box
   */
  drawDarkStatBox(ctx, x, y, width, height, label, value) {
    // Box background - Dark
    ctx.fillStyle = '#252525';
    ctx.fillRect(x, y, width, height);
    
    // Box border
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label - Gray
    ctx.fillStyle = '#999999';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, x + 10, y + 25);

    // Value - White
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(value, x + 10, y + 55);
  }
}

module.exports = new CanvasGenerator();
