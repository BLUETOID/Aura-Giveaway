const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const canvasGenerator = require('../../utils/canvasGenerator');

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
      case 'monthly':
        await handleMonthly(message, statsManager);
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
        await message.reply(`❌ Invalid subcommand. Use: \`overview\`, \`daily\`, \`weekly\`, \`monthly\`, \`members\`, \`activity\`, or \`leaderboard\``);
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
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);

  try {
    // Prepare data for image generation
    const imageData = {
      guildName: guild.name,
      memberCount: memberCount,
      onlineCount: onlineCount,
      peakOnline: todayStats.maxOnline,
      joinsToday: todayStats.joins,
      leavesToday: todayStats.leaves,
      netGrowth: netGrowth,
      messages: todayStats.messages,
      voiceHours: voiceHours,
      totalJoins: guildStats.totalStats.totalJoins,
      totalMessages: guildStats.totalStats.totalMessages
    };

    // Generate the overview stats image
    const imageBuffer = await canvasGenerator.generateOverviewStatsImage(imageData);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'overview-stats.png' });

    await message.reply({ files: [attachment] });
  } catch (error) {
    console.error('Error generating overview stats image:', error);
    await message.reply({ content: '❌ Failed to generate overview statistics. Please try again later.' });
  }
}

async function handleDaily(message, statsManager) {
  const guildId = message.guild.id;
  const todayStats = await statsManager.getTodayStats(guildId);
  const guild = message.guild;
  
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);
  const netGrowth = todayStats.joins - todayStats.leaves;

  try {
    // Get hourly data for the graph
    const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
    const activeMembers = await statsManager.getActiveMembersCount(guildId, 1);
    const peakHour = hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour;

    // Prepare data for stats image
    const statsImageData = {
      date: todayStats.date,
      joins: todayStats.joins,
      leaves: todayStats.leaves,
      netGrowth: netGrowth,
      peakOnline: todayStats.maxOnline,
      messages: todayStats.messages,
      voiceHours: voiceHours,
      activeMembers: activeMembers,
      peakHour: peakHour
    };

    // Generate the daily stats image
    const statsImageBuffer = await canvasGenerator.generateDailyStatsImage(statsImageData);
    const statsAttachment = new AttachmentBuilder(statsImageBuffer, { name: 'daily-stats.png' });

    // Create button to toggle to graph view
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_daily_${message.author.id}`)
          .setLabel('View Graph')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈')
      );

    const reply = await message.reply({ files: [statsAttachment], components: [row] });

    // Create collector for button interactions
    const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Switch to graph view
          const peakHour = hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour;
          
          const graphData = {
            subtitle: `Daily Stats - ${todayStats.date}`,
            totalMessages: todayStats.messages,
            totalVoice: voiceHours,
            peakHour: peakHour,
            activeMembers: activeMembers,
            hourlyData: hourlyData.map(h => ({
              label: h.hour,
              messages: h.messages
            }))
          };

          const graphBuffer = await canvasGenerator.generateDailyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphBuffer, { name: 'daily-graph.png' });

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_daily_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
            );

          await i.editReply({ files: [graphAttachment], components: [newRow] });
          showingGraph = true;
        } else {
          // Switch back to stats view
          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_daily_${message.author.id}`)
                .setLabel('View Graph')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📈')
            );

          await i.editReply({ files: [statsAttachment], components: [newRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling daily view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('view_disabled')
            .setLabel(showingGraph ? 'View Stats' : 'View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating daily stats:', error);
    await message.reply({ content: '❌ Failed to generate daily statistics. Please try again later.' });
  }
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
  
  const avgMessages = Math.round(totalMessages / 7);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 7).toFixed(1);
  const peakOnline = Math.max(...weeklyData.map(d => d.maxOnline));
  const avgOnline = weeklyData.reduce((sum, d) => sum + d.maxOnline, 0) / 7;

  try {
    // Prepare data for stats image
    const statsImageData = {
      totalJoins: totalJoins,
      totalLeaves: totalLeaves,
      netGrowth: netGrowth,
      totalMessages: totalMessages,
      avgMessages: avgMessages,
      totalVoiceHours: (totalVoiceMinutes / 60).toFixed(1),
      avgVoiceHours: avgVoiceHours,
      peakOnline: peakOnline,
      avgOnline: avgOnline,
      peakMessages: Math.max(...weeklyData.map(d => d.messages))
    };

    // Generate the weekly stats image
    const statsImageBuffer = await canvasGenerator.generateWeeklyStatsImage(statsImageData);
    const statsAttachment = new AttachmentBuilder(statsImageBuffer, { name: 'weekly-stats.png' });

    // Create button to toggle to graph view
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_weekly_${message.author.id}`)
          .setLabel('View Graph')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈')
      );

    const reply = await message.reply({ files: [statsAttachment], components: [row] });

    // Create collector for button interactions
    const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Switch to graph view
          const peakDay = weeklyData.reduce((max, d) => d.messages > max.messages ? d : max, weeklyData[0]);
          
          const graphData = {
            subtitle: 'Last 7 Days',
            avgMessages: avgMessages,
            avgVoice: parseFloat(avgVoiceHours),
            totalMessages: totalMessages,
            peakDay: peakDay.date,
            dailyData: weeklyData.map(d => ({
              label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
              messages: d.messages,
              voice: d.voiceMinutes / 60
            }))
          };

          const graphBuffer = await canvasGenerator.generateWeeklyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphBuffer, { name: 'weekly-graph.png' });

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_weekly_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
            );

          await i.editReply({ files: [graphAttachment], components: [newRow] });
          showingGraph = true;
        } else {
          // Switch back to stats view
          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_weekly_${message.author.id}`)
                .setLabel('View Graph')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📈')
            );

          await i.editReply({ files: [statsAttachment], components: [newRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling weekly view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('view_disabled')
            .setLabel(showingGraph ? 'View Stats' : 'View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating weekly stats:', error);
    await message.reply({ content: '❌ Failed to generate weekly statistics. Please try again later.' });
  }
}

async function handleMonthly(message, statsManager) {
  const guildId = message.guild.id;
  const monthlyData = await statsManager.getMonthlyStats(guildId);
  const guild = message.guild;
  
  // Calculate totals
  const totalJoins = monthlyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = monthlyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = monthlyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = monthlyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  // Calculate averages
  const avgMessages = Math.round(totalMessages / 30);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 30).toFixed(1);

  try {
    // Prepare data for stats image
    const statsImageData = {
      totalJoins: totalJoins,
      totalLeaves: totalLeaves,
      netGrowth: netGrowth,
      totalMessages: totalMessages,
      avgMessages: avgMessages,
      totalVoiceHours: (totalVoiceMinutes / 60).toFixed(1),
      avgVoiceHours: avgVoiceHours,
      peakOnline: Math.max(...monthlyData.map(d => d.maxOnline)),
      peakMessages: Math.max(...monthlyData.map(d => d.messages))
    };

    // Generate the monthly stats image
    const statsImageBuffer = await canvasGenerator.generateMonthlyStatsImage(statsImageData);
    const statsAttachment = new AttachmentBuilder(statsImageBuffer, { name: 'monthly-stats.png' });

    // Create button to toggle to graph view
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_monthly_${message.author.id}`)
          .setLabel('View Graph')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈')
      );

    const reply = await message.reply({ files: [statsAttachment], components: [row] });

    // Create collector for button interactions
    const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Switch to graph view
          const bestDay = monthlyData.reduce((max, d) => d.messages > max.messages ? d : max, monthlyData[0]);
          
          const graphData = {
            subtitle: 'Last 30 Days',
            totalMessages: totalMessages,
            totalVoice: totalVoiceMinutes / 60,
            avgMessages: avgMessages,
            bestDay: bestDay.date,
            dailyData: monthlyData.slice(0, 30).map(d => ({
              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              messages: d.messages
            }))
          };

          const graphBuffer = await canvasGenerator.generateMonthlyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphBuffer, { name: 'monthly-graph.png' });

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_monthly_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
            );

          await i.editReply({ files: [graphAttachment], components: [newRow] });
          showingGraph = true;
        } else {
          // Switch back to stats view
          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_monthly_${message.author.id}`)
                .setLabel('View Graph')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📈')
            );

          await i.editReply({ files: [statsAttachment], components: [newRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling monthly view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('view_disabled')
            .setLabel(showingGraph ? 'View Stats' : 'View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating monthly stats:', error);
    await message.reply({ content: '❌ Failed to generate monthly statistics. Please try again later.' });
  }
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

  try {
    // Prepare data for stats image
    const statsImageData = {
      currentMembers: guild.memberCount,
      totalJoins: totalJoins,
      totalLeaves: totalLeaves,
      netGrowth: netGrowth,
      growthRate: growthRate,
      avgJoins: Math.round(totalJoins / 7),
      avgLeaves: Math.round(totalLeaves / 7),
      bestDay: Math.max(...weeklyData.map(d => d.joins)),
      retention: (((totalJoins - totalLeaves) / totalJoins * 100) || 0).toFixed(1),
      allTimeJoins: guildStats.totalStats.totalJoins,
      allTimeLeaves: guildStats.totalStats.totalLeaves
    };

    // Generate the member stats image
    const statsImageBuffer = await canvasGenerator.generateMemberStatsImage(statsImageData);
    const statsAttachment = new AttachmentBuilder(statsImageBuffer, { name: 'member-stats.png' });

    // Create button to toggle to graph view
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_members_${message.author.id}`)
          .setLabel('View Graph')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈')
      );

    const reply = await message.reply({ files: [statsAttachment], components: [row] });

    // Create collector for button interactions
    const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Switch to graph view
          const graphData = {
            subtitle: 'Last 7 Days',
            currentMembers: guild.memberCount,
            netGrowth: netGrowth,
            totalJoins: totalJoins,
            totalLeaves: totalLeaves,
            dailyData: weeklyData.map(d => ({
              date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
              members: guild.memberCount,
              joins: d.joins,
              leaves: d.leaves
            }))
          };

          const graphBuffer = await canvasGenerator.generateMemberGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphBuffer, { name: 'member-graph.png' });

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_members_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
            );

          await i.editReply({ files: [graphAttachment], components: [newRow] });
          showingGraph = true;
        } else {
          // Switch back to stats view
          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_members_${message.author.id}`)
                .setLabel('View Graph')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📈')
            );

          await i.editReply({ files: [statsAttachment], components: [newRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling members view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('view_disabled')
            .setLabel(showingGraph ? 'View Stats' : 'View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating member stats:', error);
    await message.reply({ content: '❌ Failed to generate member statistics. Please try again later.' });
  }
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

  try {
    // Get hourly data for the graph
    const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
    const activeMembers = await statsManager.getActiveMembersCount(guildId, 7);

    // Prepare data for stats image
    const statsImageData = {
      totalMessages: totalMessages,
      avgMessages: Math.round(totalMessages / 7),
      hourlyAvg: Math.round(totalMessages / 168),
      peakDay: mostActiveDay.date,
      peakMessages: mostActiveDay.messages,
      totalVoiceHours: (totalVoiceMinutes / 60).toFixed(1),
      avgVoiceHours: (totalVoiceMinutes / 60 / 7).toFixed(1),
      peakVoice: (Math.max(...weeklyData.map(d => d.voiceMinutes)) / 60).toFixed(1),
      peakOnline: Math.max(...weeklyData.map(d => d.maxOnline)),
      avgPeakOnline: Math.round(weeklyData.reduce((sum, d) => sum + d.maxOnline, 0) / 7),
      allTimeMessages: guildStats.totalStats.totalMessages,
      allTimeVoice: (guildStats.totalStats.totalVoiceMinutes / 60).toFixed(0)
    };

    // Generate the activity stats image
    const statsImageBuffer = await canvasGenerator.generateActivityStatsImage(statsImageData);
    const statsAttachment = new AttachmentBuilder(statsImageBuffer, { name: 'activity-stats.png' });

    // Create button to toggle to graph view
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_activity_${message.author.id}`)
          .setLabel('View Graph')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📈')
      );

    const reply = await message.reply({ files: [statsAttachment], components: [row] });

    // Create collector for button interactions
    const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Switch to graph view
          const peakHour = hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour;
          
          const graphData = {
            title: 'Server Activity - Last 24 Hours',
            subtitle: guild.name,
            totalMessages: hourlyData.reduce((sum, h) => sum + h.messages, 0),
            totalVoice: hourlyData.reduce((sum, h) => sum + h.voiceMinutes, 0) / 60,
            peakHour: peakHour,
            activeMembers: activeMembers,
            hourlyData: hourlyData.map(h => ({
              label: h.hour,
              messages: h.messages,
              voice: h.voiceMinutes / 60
            }))
          };

          const graphBuffer = await canvasGenerator.generateActivityGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphBuffer, { name: 'activity-graph.png' });

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_activity_${message.author.id}`)
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
            );

          await i.editReply({ files: [graphAttachment], components: [newRow] });
          showingGraph = true;
        } else {
          // Switch back to stats view
          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_activity_${message.author.id}`)
                .setLabel('View Graph')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📈')
            );

          await i.editReply({ files: [statsAttachment], components: [newRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling activity view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('view_disabled')
            .setLabel(showingGraph ? 'View Stats' : 'View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating activity stats:', error);
    await message.reply({ content: '❌ Failed to generate activity statistics. Please try again later.' });
  }
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
