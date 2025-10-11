const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ChartGenerator = require('../../utils/charts');
const imageGenerator = require('../../utils/imageGenerator');

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
  const todayStats = await statsManager.getTodayStats(guildId);
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
      }
    )
    .setFooter({ text: `${guild.name} • Data updates in real-time • Click button for chart view` })
    .setTimestamp();

  // Create button to view chart
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_chart_daily_${interaction.user.id}`)
        .setLabel('📊')
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
          .setLabel('📊')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );
    message.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleWeekly(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
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
    .setTitle(`📊`)
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
          .setLabel('📊')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );
    message.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleMonthly(interaction, statsManager) {
  const guildId = interaction.guildId;
  const monthlyData = await statsManager.getMonthlyStats(guildId);
  const guild = interaction.guild;
  
  // Calculate totals
  const totalJoins = monthlyData.reduce((sum, day) => sum + day.joins, 0);
  const totalLeaves = monthlyData.reduce((sum, day) => sum + day.leaves, 0);
  const totalMessages = monthlyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = monthlyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  const netGrowth = totalJoins - totalLeaves;
  
  // Create mini charts
  const joinChart = createMiniChart(monthlyData.slice(0, 30).map(d => d.joins));
  const messageChart = createMiniChart(monthlyData.slice(0, 30).map(d => d.messages));
  
  // Calculate averages
  const avgMessages = Math.round(totalMessages / 30);
  const avgVoiceHours = (totalVoiceMinutes / 60 / 30).toFixed(1);
  
  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`📊`)
    .setDescription(`Past 30 days overview for ${guild.name}`)
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
          `Peak Day: **${Math.max(...monthlyData.map(d => d.messages)).toLocaleString()}**`
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
          `Highest: **${Math.max(...monthlyData.map(d => d.maxOnline))}**`,
          `Average: **${Math.round(monthlyData.reduce((sum, d) => sum + d.maxOnline, 0) / 30)}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '📅 Date Range',
        value: `${monthlyData[0].date} to ${monthlyData[29].date}`,
        inline: false
      }
    )
    .setFooter({ text: 'Monthly statistics • Last 30 days' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMembers(interaction, statsManager) {
  const guildId = interaction.guildId;
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
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
  const weeklyData = await statsManager.getWeeklyStats(guildId);
  const guildStats = await statsManager.getGuildStats(guildId);
  const guild = interaction.guild;
  
  const totalMessages = weeklyData.reduce((sum, day) => sum + day.messages, 0);
  const totalVoiceMinutes = weeklyData.reduce((sum, day) => sum + day.voiceMinutes, 0);
  
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
    .setFooter({ text: 'Activity statistics • Past 7 days • Click button for visual chart' })
    .setTimestamp();

  // Add button for image chart
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('activity_image_chart')
        .setLabel('📊 Generate Visual Chart')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎨')
    );

  const response = await interaction.reply({ embeds: [embed], components: [row] });

  // Button collector
  const collector = response.createMessageComponentCollector({
    filter: i => i.customId === 'activity_image_chart' && i.user.id === interaction.user.id,
    time: 300000 // 5 minutes
  });

  collector.on('collect', async i => {
    await i.deferUpdate();
    
    try {
      // Get hourly data for the past 24 hours
      const hourlyData = await statsManager.getHourlyActivity(guildId, 24);
      
      // Get active member count
      const activeMembers = await statsManager.getActiveMembersCount(guildId, 7);
      
      // Prepare data for image generation
      const imageData = {
        title: 'Server Activity - Last 24 Hours',
        subtitle: guild.name,
        totalMessages: hourlyData.reduce((sum, h) => sum + h.messages, 0),
        totalVoice: hourlyData.reduce((sum, h) => sum + h.voiceMinutes, 0) / 60,
        peakHour: hourlyData.reduce((max, h) => h.messages > max.messages ? h : max, hourlyData[0]).hour,
        activeMembers: activeMembers,
        hourlyData: hourlyData.map(h => ({
          label: h.hour,
          messages: h.messages,
          voice: h.voiceMinutes / 60
        }))
      };
      
      const imageBuffer = await imageGenerator.generateActivityCard(imageData);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'activity.png' });
      
      await i.followUp({ files: [attachment], ephemeral: false });
    } catch (error) {
      console.error('Error generating activity chart:', error);
      await i.followUp({ content: '❌ Error generating visual chart. Please try again.', ephemeral: true });
    }
  });

  collector.on('end', () => {
    // Disable button after timeout
    row.components[0].setDisabled(true);
    interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
  });
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
