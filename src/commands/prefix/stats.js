const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stats',
  description: 'View server statistics',
  usage: 'stats [overview|daily|weekly|members|activity|leaderboard]',
  permissions: ['ManageGuild'],

  async execute(message, args, { statsManager }) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need `Manage Server` permission to use this command.');
    }

    if (!statsManager) {
      return message.reply('❌ Statistics system is not available.');
    }

    const subcommand = args[0]?.toLowerCase() || 'overview';

    switch (subcommand) {
      case 'overview':
        await handleOverview(message, statsManager);
        break;
      case 'daily':
        await handleDaily(message, statsManager);
        break;
      case 'weekly':
        await handleWeekly(message, statsManager);
        break;
      case 'members':
        await handleMembers(message, statsManager);
        break;
      case 'activity':
        await handleActivity(message, statsManager);
        break;
      case 'leaderboard':
      case 'lb':
        await handleLeaderboard(message, args, statsManager);
        break;
      default:
        await message.reply(`❌ Invalid subcommand. Use: \`overview\`, \`daily\`, \`weekly\`, \`members\`, \`activity\`, or \`leaderboard\``);
    }
  },
};

async function handleOverview(message, statsManager) {
  const guildId = message.guild.id;
  const todayStats = await statsManager.getTodayStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  
  const guild = message.guild;
  const memberCount = guild.memberCount;
  const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
  
  const netGrowth = todayStats.joins - todayStats.leaves;
  const growthEmoji = netGrowth > 0 ? '📈' : netGrowth < 0 ? '📉' : '➖';
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);
  
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`📊 ${guild.name} - Statistics Overview`)
    .setDescription(`Today's server statistics at a glance`)
    .addFields(
      {
        name: '👥 Members',
        value: `Total: **${memberCount.toLocaleString()}**\n${growthEmoji} Net: ${netGrowth > 0 ? '+' : ''}${netGrowth} today`,
        inline: true
      },
      {
        name: '🟢 Online Now',
        value: `Current: **${onlineCount}**\nPeak: **${todayStats.maxOnline}**`,
        inline: true
      },
      {
        name: '📅 Date',
        value: `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        inline: true
      },
      {
        name: '📥 Joins Today',
        value: `**${todayStats.joins}** members`,
        inline: true
      },
      {
        name: '📤 Leaves Today',
        value: `**${todayStats.leaves}** members`,
        inline: true
      },
      {
        name: '💬 Messages',
        value: `**${todayStats.messages.toLocaleString()}** sent`,
        inline: true
      },
      {
        name: '🎤 Voice Activity',
        value: `**${voiceHours}** hours`,
        inline: true
      },
      {
        name: '📈 All-Time Stats',
        value: `Total Joins: **${guildStats.totalStats.totalJoins.toLocaleString()}**\nTotal Messages: **${guildStats.totalStats.totalMessages.toLocaleString()}**`,
        inline: true
      }
    )
    .setFooter({ text: 'Statistics reset daily at midnight UTC' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleDaily(message, statsManager) {
  const guildId = message.guild.id;
  const todayStats = await statsManager.getTodayStats(guildId);
  const guild = message.guild;
  
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);
  const netGrowth = todayStats.joins - todayStats.leaves;
  
  const maxMessages = 1000;
  const messageProgress = createProgressBar(todayStats.messages, maxMessages);
  
  const embed = new EmbedBuilder()
    .setColor('#00D9FF')
    .setTitle(`📅 Daily Statistics - ${todayStats.date}`)
    .setDescription(`Detailed breakdown of today's activity`)
    .addFields(
      {
        name: '👥 Member Activity',
        value: [
          `📥 Joins: **${todayStats.joins}**`,
          `📤 Leaves: **${todayStats.leaves}**`,
          `📊 Net Growth: **${netGrowth > 0 ? '+' : ''}${netGrowth}**`,
          `🟢 Peak Online: **${todayStats.maxOnline}**`
        ].join('\n'),
        inline: false
      },
      {
        name: '💬 Message Activity',
        value: [
          `Total: **${todayStats.messages.toLocaleString()}** messages`,
          messageProgress,
          `Avg: **${Math.round(todayStats.messages / 24)}** per hour`
        ].join('\n'),
        inline: false
      },
      {
        name: '🎤 Voice Activity',
        value: [
          `Total: **${voiceHours}** hours`,
          `Minutes: **${todayStats.voiceMinutes.toLocaleString()}**`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `${guild.name} • Data updates in real-time` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleWeekly(message, statsManager) {
  const guildId = message.guild.id;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guild = message.guild;
  
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  const joinChart = createMiniChart(weeklyData.map(d => d.joins));
  const messageChart = createMiniChart(weeklyData.map(d => d.messages));
  
  const avgMessages = Math.round(totalMessages / 7);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 7).toFixed(1);
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`📊 Weekly Statistics`)
    .setDescription(`Past 7 days overview for ${guild.name}`)
    .addFields(
      {
        name: '👥 Member Growth',
        value: [
          `Joins: **${totalJoins}** ${joinChart}`,
          `Leaves: **${totalLeaves}**`,
          `Net: **${netGrowth > 0 ? '+' : ''}${netGrowth}** members`
        ].join('\n'),
        inline: false
      },
      {
        name: '💬 Message Activity',
        value: [
          `Total: **${totalMessages.toLocaleString()}** ${messageChart}`,
          `Daily Avg: **${avgMessages.toLocaleString()}**`,
          `Peak Day: **${Math.max(...weeklyData.map(d => d.messages)).toLocaleString()}**`
        ].join('\n'),
        inline: false
      },
      {
        name: '🎤 Voice Activity',
        value: [
          `Total: **${(totalVoiceMinutes / 60).toFixed(1)}** hours`,
          `Daily Avg: **${avgVoiceHours}** hours`
        ].join('\n'),
        inline: true
      },
      {
        name: '📈 Peak Online',
        value: [
          `Highest: **${Math.max(...weeklyData.map(d => d.maxOnline))}**`,
          `Average: **${Math.round(weeklyData.reduce((sum, d) => sum + d.maxOnline, 0) / 7)}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '📅 Date Range',
        value: `${weeklyData[0].date} to ${weeklyData[6].date}`,
        inline: false
      }
    )
    .setFooter({ text: 'Weekly statistics • Last 7 days' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleMembers(message, statsManager) {
  const guildId = message.guild.id;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  const guild = message.guild;
  
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const netGrowth = totalJoins - totalLeaves;
  const growthRate = ((netGrowth / guild.memberCount) * 100).toFixed(2);
  
  const dayBreakdown = weeklyData.map(day => {
    const net = day.joins - day.leaves;
    const emoji = net > 0 ? '📈' : net < 0 ? '📉' : '➖';
    const dateObj = new Date(day.date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${emoji} ${dayName}: +${day.joins} / -${day.leaves} (${net > 0 ? '+' : ''}${net})`;
  }).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle(`👥 Member Growth Statistics`)
    .setDescription(`Membership trends for ${guild.name}`)
    .addFields(
      {
        name: '📊 Current Status',
        value: [
          `Total Members: **${guild.memberCount.toLocaleString()}**`,
          `Growth Rate: **${growthRate}%** (7 days)`,
          `Net Change: **${netGrowth > 0 ? '+' : ''}${netGrowth}**`
        ].join('\n'),
        inline: false
      },
      {
        name: '📥 Join Statistics (7 days)',
        value: [
          `Total Joins: **${totalJoins}**`,
          `Daily Average: **${Math.round(totalJoins / 7)}**`,
          `Best Day: **${Math.max(...weeklyData.map(d => d.joins))}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '📤 Leave Statistics (7 days)',
        value: [
          `Total Leaves: **${totalLeaves}**`,
          `Daily Average: **${Math.round(totalLeaves / 7)}**`,
          `Retention: **${(((totalJoins - totalLeaves) / totalJoins * 100) || 0).toFixed(1)}%**`
        ].join('\n'),
        inline: true
      },
      {
        name: '📅 Daily Breakdown',
        value: dayBreakdown,
        inline: false
      },
      {
        name: '🏆 All-Time Statistics',
        value: [
          `Total Joins: **${guildStats.totalStats.totalJoins.toLocaleString()}**`,
          `Total Leaves: **${guildStats.totalStats.totalLeaves.toLocaleString()}**`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: 'Member statistics • Updated in real-time' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleActivity(message, statsManager) {
  const guildId = message.guild.id;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  const guild = message.guild;
  
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  
  const mostActiveDay = weeklyData.reduce((max, day) => 
    day.messages > max.messages ? day : max, weeklyData[0]);
  
  const messageChart = createMiniChart(weeklyData.map(d => d.messages));
  const voiceChart = createMiniChart(weeklyData.map(d => d.voiceMinutes));
  
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(`📈 Server Activity Statistics`)
    .setDescription(`Activity overview for ${guild.name}`)
    .addFields(
      {
        name: '💬 Message Activity (7 days)',
        value: [
          `${messageChart}`,
          `Total: **${totalMessages.toLocaleString()}** messages`,
          `Daily Avg: **${Math.round(totalMessages / 7).toLocaleString()}**`,
          `Hourly Avg: **${Math.round(totalMessages / 168)}**`,
          `Peak Day: **${mostActiveDay.date}** (${mostActiveDay.messages.toLocaleString()})`
        ].join('\n'),
        inline: false
      },
      {
        name: '🎤 Voice Activity (7 days)',
        value: [
          `${voiceChart}`,
          `Total: **${(totalVoiceMinutes / 60).toFixed(1)}** hours`,
          `Daily Avg: **${(totalVoiceMinutes / 60 / 7).toFixed(1)}** hours`,
          `Peak: **${(Math.max(...weeklyData.map(d => d.voiceMinutes)) / 60).toFixed(1)}** hours`
        ].join('\n'),
        inline: false
      },
      {
        name: '🟢 Online Activity',
        value: [
          `Peak: **${Math.max(...weeklyData.map(d => d.maxOnline))}** members`,
          `Avg Peak: **${Math.round(weeklyData.reduce((sum, d) => sum + d.maxOnline, 0) / 7)}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '📊 All-Time Totals',
        value: [
          `Messages: **${guildStats.totalStats.totalMessages.toLocaleString()}**`,
          `Voice: **${(guildStats.totalStats.totalVoiceMinutes / 60).toFixed(0)}** hours`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: 'Activity statistics • Past 7 days' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

function createProgressBar(current, max, length = 10) {
  const filled = Math.min(Math.round((current / max) * length), length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round((current / max) * 100)}%`;
}

function createMiniChart(data) {
  const max = Math.max(...data, 1);
  const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return data.map(value => {
    const index = Math.min(Math.floor((value / max) * bars.length), bars.length - 1);
    return bars[index];
  }).join('');
}

async function handleLeaderboard(message, args, statsManager) {
  // Parse arguments: !stats leaderboard [period] [limit]
  const period = args[1]?.toLowerCase() || 'all';
  const limit = parseInt(args[2]) || 10;
  
  const validPeriods = ['all', 'monthly', 'weekly', 'daily'];
  if (!validPeriods.includes(period)) {
    return message.reply(`❌ Invalid period. Use: \`all\`, \`monthly\`, \`weekly\`, or \`daily\`\n**Usage:** \`!stats leaderboard [period] [limit]\``);
  }

  if (limit < 1 || limit > 25) {
    return message.reply('❌ Limit must be between 1 and 25.');
  }

  try {
    const leaderboard = await statsManager.getMessageLeaderboard(
      message.guild.id,
      limit,
      period
    );
    
    if (leaderboard.length === 0) {
      return message.reply('📊 No message data available for the selected period.');
    }

    const periodNames = {
      all: 'All Time',
      monthly: 'This Month',
      weekly: 'This Week',
      daily: 'Today'
    };

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle(`🏆 Message Leaderboard - ${periodNames[period]}`)
      .setDescription('Top message senders in this server')
      .setTimestamp();

    let description = '';
    leaderboard.forEach((user, index) => {
      const medal = 
        index === 0 ? '🥇' : 
        index === 1 ? '🥈' : 
        index === 2 ? '🥉' : 
        `**${index + 1}.**`;
      
      const lastActive = user.lastActive ? 
        `<t:${Math.floor(user.lastActive.getTime() / 1000)}:R>` : 
        'Unknown';
        
      description += `${medal} **${user.username}** - **${user.messages.toLocaleString()}** messages\n`;
      description += `└ Last active: ${lastActive}\n\n`;
    });

    embed.setDescription(description);
    embed.setFooter({ text: `${message.guild.name} • ${periodNames[period]} Stats • Use: !stats leaderboard [all|monthly|weekly|daily] [limit]` });
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in leaderboard:', error);
    await message.reply('❌ Error loading leaderboard.');
  }
}
