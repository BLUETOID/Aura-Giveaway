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
   * Generate daily stats summary image (text-based, replaces embed)
   */
  async generateDailyStatsImage(data) {
    const width = 800;
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

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('📅 Daily Statistics', 50, 70);

    // Date
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText(data.date || 'Today', 50, 105);

    let y = 160;

    // Member Activity Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('👥 Member Activity', 50, y);
    y += 35;

    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`📥 Joins: ${data.joins || 0}`, 70, y);
    ctx.fillText(`📤 Leaves: ${data.leaves || 0}`, 300, y);
    y += 30;
    ctx.fillText(`📊 Net Growth: ${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`, 70, y);
    ctx.fillText(`🟢 Peak Online: ${data.maxOnline || 0}`, 300, y);
    y += 50;

    // Message Activity Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('💬 Message Activity', 50, y);
    y += 35;

    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.totalMessages?.toLocaleString() || '0'} messages`, 70, y);
    y += 30;
    ctx.fillText(`Hourly Avg: ${data.avgMessages || 0}`, 70, y);
    y += 50;

    // Voice Activity Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🎤 Voice Activity', 50, y);
    y += 35;

    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.voiceHours || 0} hours`, 70, y);
    ctx.fillText(`Minutes: ${data.voiceMinutes?.toLocaleString() || '0'}`, 300, y);

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
    const width = 800;
    const height = 500;
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
    ctx.fillText('📊 Weekly Statistics', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText('Last 7 Days', 50, 105);

    let y = 160;

    // Member Growth
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('👥 Member Growth', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Joins: ${data.totalJoins || 0}`, 70, y);
    ctx.fillText(`Leaves: ${data.totalLeaves || 0}`, 300, y);
    y += 30;
    ctx.fillText(`Net: ${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`, 70, y);
    y += 50;

    // Message Activity
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('💬 Message Activity', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.totalMessages?.toLocaleString() || '0'}`, 70, y);
    y += 30;
    ctx.fillText(`Daily Avg: ${data.avgMessages?.toLocaleString() || '0'}`, 70, y);
    ctx.fillText(`Peak: ${data.peakMessages?.toLocaleString() || '0'}`, 300, y);
    y += 50;

    // Voice Activity
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🎤 Voice Activity', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.totalVoice || '0'} hours`, 70, y);
    ctx.fillText(`Daily Avg: ${data.avgVoice || '0'} hours`, 300, y);

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
    const width = 800;
    const height = 500;
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
    ctx.fillText('📊 Monthly Statistics', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText('Last 30 Days', 50, 105);

    let y = 160;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('👥 Member Growth', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Joins: ${data.totalJoins || 0}`, 70, y);
    ctx.fillText(`Leaves: ${data.totalLeaves || 0}`, 300, y);
    y += 30;
    ctx.fillText(`Net: ${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`, 70, y);
    y += 50;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('💬 Message Activity', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.totalMessages?.toLocaleString() || '0'}`, 70, y);
    y += 30;
    ctx.fillText(`Daily Avg: ${data.avgMessages?.toLocaleString() || '0'}`, 70, y);
    ctx.fillText(`Peak: ${data.peakMessages?.toLocaleString() || '0'}`, 300, y);
    y += 50;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🎤 Voice Activity', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total: ${data.totalVoice || '0'} hours`, 70, y);
    ctx.fillText(`Daily Avg: ${data.avgVoice || '0'} hours`, 300, y);

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
    const width = 800;
    const height = 500;
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
    ctx.fillText('👥 Member Growth', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText('Last 7 Days', 50, 105);

    let y = 160;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('📊 Current Status', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total Members: ${data.currentMembers?.toLocaleString() || '0'}`, 70, y);
    y += 30;
    ctx.fillText(`Growth Rate: ${data.growthRate || '0'}%`, 70, y);
    ctx.fillText(`Net Change: ${data.netGrowth > 0 ? '+' : ''}${data.netGrowth || 0}`, 300, y);
    y += 50;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('📥 Join Statistics', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total Joins: ${data.totalJoins || 0}`, 70, y);
    ctx.fillText(`Daily Avg: ${data.avgJoins || 0}`, 300, y);
    y += 30;
    ctx.fillText(`Best Day: ${data.bestJoinDay || 0}`, 70, y);
    y += 50;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('📤 Leave Statistics', 50, y);
    y += 35;
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total Leaves: ${data.totalLeaves || 0}`, 70, y);
    ctx.fillText(`Daily Avg: ${data.avgLeaves || 0}`, 300, y);
    y += 30;
    ctx.fillText(`Retention: ${data.retention || '0'}%`, 70, y);

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
    const width = 800;
    const height = 500;
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
    ctx.fillText('📈 Server Activity', 50, 70);
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    ctx.fillText('Last 24 Hours', 50, 105);

    let y = 180;

    this.drawDarkStatBox(ctx, 50, y, 330, 90, '💬 Total Messages', data.totalMessages?.toLocaleString() || '0');
    this.drawDarkStatBox(ctx, 420, y, 330, 90, '🎤 Voice Hours', (data.totalVoice?.toFixed(1) || '0') + 'h');
    
    y += 120;
    this.drawDarkStatBox(ctx, 50, y, 330, 90, '📊 Peak Hour', data.peakHour || 'N/A');
    this.drawDarkStatBox(ctx, 420, y, 330, 90, '👥 Active Members', data.activeMembers?.toString() || '0');

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

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(config.title, 50, 60);

    // Subtitle
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

    // Draw grid lines
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();
    }

    // Draw each line
    config.lines.forEach(lineConfig => {
      const maxValue = Math.max(...config.chartData.map(d => d[lineConfig.dataKey] || 0), 1);
      const pointSpacing = chartWidth / (config.chartData.length - 1 || 1);

      ctx.strokeStyle = lineConfig.color;
      ctx.lineWidth = 3;
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

      // Draw points
      ctx.fillStyle = lineConfig.color;
      config.chartData.forEach((item, index) => {
        const value = item[lineConfig.dataKey] || 0;
        const x = chartX + (index * pointSpacing);
        const y = chartY + chartHeight - ((value / maxValue) * (chartHeight - 20)) - 10;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw legend
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
