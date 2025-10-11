const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ChartGenerator = require('../../utils/charts');
const canvasGenerator = require('../../utils/canvasGenerator');

const chartGenerator = new ChartGenerator();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('overview')
        .setDescription('View today\'s server statistics overview'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('daily')
        .setDescription('View detailed daily statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('weekly')
        .setDescription('View weekly statistics summary'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('monthly')
        .setDescription('View monthly statistics summary'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('members')
        .setDescription('View member growth statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('activity')
        .setDescription('View server activity statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View message leaderboard')
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('Time period for leaderboard')
            .setRequired(false)
            .addChoices(
              { name: 'All Time', value: 'all' },
              { name: 'This Month', value: 'monthly' },
              { name: 'This Week', value: 'weekly' },
              { name: 'Today', value: 'daily' }
            ))
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of users to show (max 25)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25))),

  async execute(interaction, { statsManager }) {
    if (!statsManager) {
      return interaction.reply({ content: 'Statistics system is not available.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'overview':
        await handleOverview(interaction, statsManager);
        break;
      case 'daily':
        await handleDaily(interaction, statsManager);
        break;
      case 'weekly':
        await handleWeekly(interaction, statsManager);
        break;
      case 'monthly':
        await handleMonthly(interaction, statsManager);
        break;
      case 'members':
        await handleMembers(interaction, statsManager);
        break;
      case 'activity':
        await handleActivity(interaction, statsManager);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction, statsManager);
        break;
    }
  },
};

async function handleOverview(interaction, statsManager) {
  const guildId = interaction.guildId;
  const todayStats = await statsManager.getTodayStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  
  const guild = interaction.guild;
  const memberCount = guild.memberCount;
  const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
  
  const netGrowth = todayStats.joins - todayStats.leaves;
  const growthEmoji = netGrowth > 0 ? '📈' : netGrowth < 0 ? '📉' : '➖';
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);

  try {
    // Generate overview stats image
    const statsImageData = {
      memberCount: memberCount,
      onlineCount: onlineCount,
      maxOnline: todayStats.maxOnline,
      joins: todayStats.joins,
      leaves: todayStats.leaves,
      netGrowth: netGrowth,
      growthEmoji: growthEmoji,
      messages: todayStats.messages,
      voiceHours: voiceHours
    };

    const statsImage = await canvasGenerator.generateOverviewStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'overview-stats.png' });

    await interaction.reply({ files: [attachment] });
  } catch (error) {
    console.error('Error in handleOverview:', error);
    await interaction.reply({ content: '❌ Error generating overview stats.', ephemeral: true });
  }
}

async function handleDaily(interaction, statsManager) {
  const guildId = interaction.guildId;
  const todayStats = await statsManager.getTodayStats(guildId);
  const guild = interaction.guild;
  
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);
  const netGrowth = todayStats.joins - todayStats.leaves;
  const avgMessages = Math.round(todayStats.messages / 24);

  try {
    // Get hourly data and active members
    const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
    const activeMembers = await statsManager.getActiveMembersCount(guildId, 1);
    const peakHour = hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour;

    // Generate stats summary image
    const statsImageData = {
      date: todayStats.date,
      joins: todayStats.joins,
      leaves: todayStats.leaves,
      netGrowth: netGrowth,
      peakOnline: todayStats.maxOnline,
      messages: todayStats.messages,
      avgMessages: avgMessages,
      voiceHours: voiceHours,
      activeMembers: activeMembers,
      peakHour: peakHour
    };

    const statsImage = await canvasGenerator.generateDailyStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'daily-stats.png' });

    // Create button to view graph
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_daily_${interaction.user.id}`)
          .setLabel('� View Graph')
          .setStyle(ButtonStyle.Success)
      );

    const message = await interaction.reply({ files: [attachment], components: [row], fetchReply: true });

    // Button collector
    const collector = message.createMessageComponentCollector({ time: 300000 });
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Show graph
          const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
          const activeMembers = await statsManager.getActiveMembersCount(guildId, 1);
          
          const graphData = {
            subtitle: `Daily Stats - ${todayStats.date}`,
            totalMessages: todayStats.messages,
            totalVoice: parseFloat(voiceHours),
            peakHour: hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour,
            activeMembers: activeMembers,
            hourlyData: hourlyData.map(h => ({
              label: h.hour,
              messages: h.messages
            }))
          };

          const graphImage = await canvasGenerator.generateDailyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphImage, { name: 'daily-graph.png' });

          const graphRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_daily_${interaction.user.id}`)
                .setLabel('📊 View Stats')
                .setStyle(ButtonStyle.Primary)
            );

          await i.editReply({ files: [graphAttachment], components: [graphRow] });
          showingGraph = true;
        } else {
          // Show stats again
          const statsRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_daily_${interaction.user.id}`)
                .setLabel('📈 View Graph')
                .setStyle(ButtonStyle.Success)
            );

          await i.editReply({ files: [attachment], components: [statsRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel(showingGraph ? '📊 View Stats' : '📈 View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error in handleDaily:', error);
    await interaction.reply({ content: '❌ Error generating daily stats.', ephemeral: true });
  }
}

async function handleWeekly(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guild = interaction.guild;
  
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  const avgMessages = Math.round(totalMessages / 7);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 7).toFixed(1);
  const peakMessages = Math.max(...weeklyData.map(d => d.messages));
  const peakOnline = Math.max(...weeklyData.map(d => d.maxOnline));
  const avgOnline = weeklyData.reduce((sum, d) => sum + d.maxOnline, 0) / 7;

  try {
    // Generate stats summary image
    const statsImageData = {
      totalJoins: totalJoins,
      totalLeaves: totalLeaves,
      netGrowth: netGrowth,
      totalMessages: totalMessages,
      avgMessages: avgMessages,
      peakMessages: peakMessages,
      totalVoiceHours: (totalVoiceMinutes / 60).toFixed(1),
      avgVoiceHours: avgVoiceHours,
      peakOnline: peakOnline,
      avgOnline: avgOnline
    };

    const statsImage = await canvasGenerator.generateWeeklyStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'weekly-stats.png' });

    // Create button to view graph
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_weekly_${interaction.user.id}`)
          .setLabel('� View Graph')
          .setStyle(ButtonStyle.Success)
      );

    const message = await interaction.reply({ files: [attachment], components: [row], fetchReply: true });

    // Button collector
    const collector = message.createMessageComponentCollector({ time: 300000 });
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Show graph
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

          const graphImage = await canvasGenerator.generateWeeklyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphImage, { name: 'weekly-graph.png' });

          const graphRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_weekly_${interaction.user.id}`)
                .setLabel('📊 View Stats')
                .setStyle(ButtonStyle.Primary)
            );

          await i.editReply({ files: [graphAttachment], components: [graphRow] });
          showingGraph = true;
        } else {
          // Show stats again
          const statsRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_weekly_${interaction.user.id}`)
                .setLabel('📈 View Graph')
                .setStyle(ButtonStyle.Success)
            );

          await i.editReply({ files: [attachment], components: [statsRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel(showingGraph ? '📊 View Stats' : '📈 View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error in handleWeekly:', error);
    await interaction.reply({ content: '❌ Error generating weekly stats.', ephemeral: true });
  }
}

async function handleMonthly(interaction, statsManager) {
  const guildId = interaction.guildId;
  const monthlyData = await statsManager.getMonthlyStats(guildId);
  const guild = interaction.guild;
  
  const totalJoins = monthlyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = monthlyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = monthlyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = monthlyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  const avgMessages = Math.round(totalMessages / 30);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 30).toFixed(1);
  const peakMessages = Math.max(...monthlyData.map(d => d.messages));
  const peakOnline = Math.max(...monthlyData.map(d => d.maxOnline));

  try {
    // Generate stats summary image
    const statsImageData = {
      totalJoins: totalJoins,
      totalLeaves: totalLeaves,
      netGrowth: netGrowth,
      totalMessages: totalMessages,
      avgMessages: avgMessages,
      peakMessages: peakMessages,
      totalVoiceHours: (totalVoiceMinutes / 60).toFixed(1),
      avgVoiceHours: avgVoiceHours,
      peakOnline: peakOnline
    };

    const statsImage = await canvasGenerator.generateMonthlyStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'monthly-stats.png' });

    // Create button to view graph
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_monthly_${interaction.user.id}`)
          .setLabel('� View Graph')
          .setStyle(ButtonStyle.Success)
      );

    const message = await interaction.reply({ files: [attachment], components: [row], fetchReply: true });

    // Button collector
    const collector = message.createMessageComponentCollector({ time: 300000 });
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Show graph
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

          const graphImage = await canvasGenerator.generateMonthlyGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphImage, { name: 'monthly-graph.png' });

          const graphRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_monthly_${interaction.user.id}`)
                .setLabel('📊 View Stats')
                .setStyle(ButtonStyle.Primary)
            );

          await i.editReply({ files: [graphAttachment], components: [graphRow] });
          showingGraph = true;
        } else {
          // Show stats again
          const statsRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_monthly_${interaction.user.id}`)
                .setLabel('📈 View Graph')
                .setStyle(ButtonStyle.Success)
            );

          await i.editReply({ files: [attachment], components: [statsRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel(showingGraph ? '📊 View Stats' : '📈 View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error in handleMonthly:', error);
    await interaction.reply({ content: '❌ Error generating monthly stats.', ephemeral: true });
  }
}

async function handleMembers(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  const guild = interaction.guild;
  
async function handleMembers(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  const guild = interaction.guild;
  
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const netGrowth = totalJoins - totalLeaves;
  const growthRate = ((netGrowth / guild.memberCount) * 100).toFixed(2);
  const avgJoins = Math.round(totalJoins / 7);
  const avgLeaves = Math.round(totalLeaves / 7);
  const bestJoinDay = Math.max(...weeklyData.map(d => d.joins));
  const retention = (((totalJoins - totalLeaves) / totalJoins * 100) || 0).toFixed(1);

  try {
    // Generate stats summary image
    const statsImageData = {
      currentMembers: guild.memberCount,
      growthRate: growthRate,
      netGrowth: netGrowth,
      totalJoins: totalJoins,
      avgJoins: avgJoins,
      bestJoinDay: bestJoinDay,
      totalLeaves: totalLeaves,
      avgLeaves: avgLeaves,
      retention: retention
    };

    const statsImage = await canvasGenerator.generateMemberStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'member-stats.png' });

    // Create button to view graph
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_members_${interaction.user.id}`)
          .setLabel('� View Graph')
          .setStyle(ButtonStyle.Success)
      );

    const message = await interaction.reply({ files: [attachment], components: [row], fetchReply: true });

    // Button collector
    const collector = message.createMessageComponentCollector({ time: 300000 });
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Show graph
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

          const graphImage = await canvasGenerator.generateMemberGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphImage, { name: 'member-graph.png' });

          const graphRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_members_${interaction.user.id}`)
                .setLabel('📊 View Stats')
                .setStyle(ButtonStyle.Primary)
            );

          await i.editReply({ files: [graphAttachment], components: [graphRow] });
          showingGraph = true;
        } else {
          // Show stats again
          const statsRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_members_${interaction.user.id}`)
                .setLabel('📈 View Graph')
                .setStyle(ButtonStyle.Success)
            );

          await i.editReply({ files: [attachment], components: [statsRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel(showingGraph ? '📊 View Stats' : '📈 View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error in handleMembers:', error);
    await interaction.reply({ content: '❌ Error generating member stats.', ephemeral: true });
  }
}

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('stats_chart_members_disabled')
          .setLabel('📊 Generate Visual Chart')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );
    message.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleActivity(interaction, statsManager) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;

  try {
    // Get hourly data for the past 24 hours
    const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
    const activeMembers = await statsManager.getActiveMembersCount(guildId, 7);
    
    const totalMessages = hourlyData.reduce((sum, h) => sum + h.messages, 0);
    const totalVoice = hourlyData.reduce((sum, h) => sum + h.voiceMinutes, 0) / 60;
    const peakHour = hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour;

    // Generate stats summary image
    const statsImageData = {
      totalMessages: totalMessages,
      totalVoice: totalVoice,
      peakHour: peakHour,
      activeMembers: activeMembers
    };

    const statsImage = await canvasGenerator.generateActivityStatsImage(statsImageData);
    const attachment = new AttachmentBuilder(statsImage, { name: 'activity-stats.png' });

    // Create button to view graph
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`view_graph_activity_${interaction.user.id}`)
          .setLabel('� View Graph')
          .setStyle(ButtonStyle.Success)
      );

    const message = await interaction.reply({ files: [attachment], components: [row], fetchReply: true });

    // Button collector
    const collector = message.createMessageComponentCollector({ time: 300000 });
    let showingGraph = false;

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This button is not for you!', ephemeral: true });
      }

      await i.deferUpdate();

      try {
        if (!showingGraph) {
          // Show graph
          const graphData = {
            subtitle: guild.name,
            totalMessages: totalMessages,
            totalVoice: totalVoice,
            peakHour: peakHour,
            activeMembers: activeMembers,
            hourlyData: hourlyData.map(h => ({
              label: h.hour,
              messages: h.messages,
              voice: h.voiceMinutes / 60
            }))
          };

          const graphImage = await canvasGenerator.generateActivityGraph(graphData);
          const graphAttachment = new AttachmentBuilder(graphImage, { name: 'activity-graph.png' });

          const graphRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_stats_activity_${interaction.user.id}`)
                .setLabel('📊 View Stats')
                .setStyle(ButtonStyle.Primary)
            );

          await i.editReply({ files: [graphAttachment], components: [graphRow] });
          showingGraph = true;
        } else {
          // Show stats again
          const statsRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`view_graph_activity_${interaction.user.id}`)
                .setLabel('📈 View Graph')
                .setStyle(ButtonStyle.Success)
            );

          await i.editReply({ files: [attachment], components: [statsRow] });
          showingGraph = false;
        }
      } catch (error) {
        console.error('Error toggling view:', error);
        await i.followUp({ content: '❌ Failed to switch view. Please try again.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel(showingGraph ? '📊 View Stats' : '📈 View Graph')
            .setStyle(showingGraph ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(true)
        );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error('Error in handleActivity:', error);
    await interaction.reply({ content: '❌ Error generating activity stats.', ephemeral: true });
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

async function handleLeaderboard(interaction, statsManager) {
  const period = interaction.options.getString('period') || 'all';
  const limit = interaction.options.getInteger('limit') || 10;
  
  await interaction.deferReply();
  
  try {
    const leaderboard = await statsManager.getMessageLeaderboard(
      interaction.guild.id,
      limit,
      period
    );
    
    if (leaderboard.length === 0) {
      return interaction.editReply('📊 No message data available for the selected period.');
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
    embed.setFooter({ text: `${interaction.guild.name} • ${periodNames[period]} Stats` });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in leaderboard:', error);
    await interaction.editReply('❌ Error loading leaderboard.');
  }
}
