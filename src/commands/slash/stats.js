const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ChartGenerator = require('../../utils/charts');

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
        .setName('members')
        .setDescription('View member growth statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('activity')
        .setDescription('View server activity statistics')),

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
      case 'members':
        await handleMembers(interaction, statsManager);
        break;
      case 'activity':
        await handleActivity(interaction, statsManager);
        break;
    }
  },
};

async function handleOverview(interaction, statsManager) {
  const guildId = interaction.guildId;
  const todayStats = statsManager.getTodayStats(guildId);
  const guildStats = statsManager.getGuildStats(guildId);
  
  const guild = interaction.guild;
  const memberCount = guild.memberCount;
  const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
  
  // Calculate net growth
  const netGrowth = todayStats.joins - todayStats.leaves;
  const growthEmoji = netGrowth > 0 ? '📈' : netGrowth < 0 ? '📉' : '➖';
  
  // Format voice time
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
        name: '🎭 Role Changes',
        value: `**${todayStats.roleChanges}** today`,
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

  await interaction.reply({ embeds: [embed] });
}

async function handleDaily(interaction, statsManager) {
  const guildId = interaction.guildId;
  const todayStats = statsManager.getTodayStats(guildId);
  const guild = interaction.guild;
  
  const voiceHours = (todayStats.voiceMinutes / 60).toFixed(1);
  const netGrowth = todayStats.joins - todayStats.leaves;
  
  // Create progress bars
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
      },
      {
        name: '🎭 Role Activity',
        value: [
          `Changes: **${todayStats.roleChanges}**`,
          `Type: Assignments & Removals`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `${guild.name} • Data updates in real-time • Click button for chart view` })
    .setTimestamp();

  // Create button to view chart
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_chart_daily_${interaction.user.id}`)
        .setLabel('📊 View Chart')
        .setStyle(ButtonStyle.Primary)
    );

  const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  // Create collector for button
  const collector = message.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'This button is not for you!', ephemeral: true });
    }

    if (i.customId.startsWith('stats_chart_daily')) {
      await i.deferReply({ ephemeral: true });

      try {
        const chartUrl = chartGenerator.generateDailyChart(todayStats);

        const chartEmbed = new EmbedBuilder()
          .setColor('#00D9FF')
          .setTitle(`📊 Daily Activity Chart - ${todayStats.date}`)
          .setDescription('Activity distribution for today')
          .setImage(chartUrl)
          .setFooter({ text: 'Note: Messages scaled down by 10x for better visualization' })
          .setTimestamp();

        await i.editReply({ embeds: [chartEmbed] });
      } catch (error) {
        console.error('Error generating chart:', error);
        await i.editReply({ content: '❌ Failed to generate chart. Please try again later.' });
      }
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('stats_chart_daily_disabled')
          .setLabel('📊 View Chart')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );
    message.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleWeekly(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = statsManager.getWeeklyStats(guildId);
  const guild = interaction.guild;
  
  // Calculate totals
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  // Create mini charts
  const joinChart = createMiniChart(weeklyData.map(d => d.joins));
  const messageChart = createMiniChart(weeklyData.map(d => d.messages));
  
  // Calculate averages
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
    .setFooter({ text: 'Weekly statistics • Last 7 days • Click button for chart view' })
    .setTimestamp();

  // Create button to view chart
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_chart_weekly_${interaction.user.id}`)
        .setLabel('📊 View Chart')
        .setStyle(ButtonStyle.Primary)
    );

  const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  // Create collector for button
  const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'This button is not for you!', ephemeral: true });
    }

    if (i.customId.startsWith('stats_chart_weekly')) {
      await i.deferReply({ ephemeral: true });

      try {
        // Generate chart URL
        const activityChartUrl = chartGenerator.generateActivityChart(weeklyData);
        const memberChartUrl = chartGenerator.generateMemberGrowthChart(weeklyData);

        const chartEmbed1 = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('📊 Weekly Activity Chart')
          .setDescription('Message and voice activity over the past 7 days')
          .setImage(activityChartUrl)
          .setFooter({ text: 'Data visualization • Last 7 days' })
          .setTimestamp();

        const chartEmbed2 = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('👥 Member Growth Chart')
          .setDescription('Joins vs leaves over the past 7 days')
          .setImage(memberChartUrl)
          .setFooter({ text: 'Member statistics • Last 7 days' })
          .setTimestamp();

        await i.editReply({ embeds: [chartEmbed1, chartEmbed2] });
      } catch (error) {
        console.error('Error generating chart:', error);
        await i.editReply({ content: '❌ Failed to generate chart. Please try again later.' });
      }
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_chart_weekly_disabled`)
          .setLabel('📊 View Chart')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );
    message.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleMembers(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = statsManager.getWeeklyStats(guildId);
  const guildStats = statsManager.getGuildStats(guildId);
  const guild = interaction.guild;
  
  const totalJoins = weeklyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = weeklyData.reduce((sum, day) => sum + day.leaves, 0);
  const netGrowth = totalJoins - totalLeaves;
  const growthRate = ((netGrowth / guild.memberCount) * 100).toFixed(2);
  
  // Day-by-day breakdown
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

  await interaction.reply({ embeds: [embed] });
}

async function handleActivity(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = statsManager.getWeeklyStats(guildId);
  const guildStats = statsManager.getGuildStats(guildId);
  const guild = interaction.guild;
  
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const totalRoleChanges = weeklyData.reduce((sum, day) => sum + day.roleChanges, 0);
  
  // Find most active day
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
        name: '🎭 Role Activity (7 days)',
        value: [
          `Changes: **${totalRoleChanges}**`,
          `Daily Avg: **${Math.round(totalRoleChanges / 7)}**`
        ].join('\n'),
        inline: true
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
          `Voice: **${(guildStats.totalStats.totalVoiceMinutes / 60).toFixed(0)}** hours`,
          `Roles: **${guildStats.totalStats.totalRoleChanges.toLocaleString()}** changes`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: 'Activity statistics • Past 7 days' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
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
