const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'View detailed user statistics and information',
  usage: 'userinfo [@user]',
  aliases: ['ui', 'whois'],

  async execute(message, args, { statsManager }) {
    try {
      let targetUser = message.author;
      
      // Check if a user was mentioned
      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
      } else if (args.length > 0) {
        // Try to get user by ID
        try {
          targetUser = await message.client.users.fetch(args[0]);
        } catch (error) {
          return message.reply('❌ Could not find that user. Please mention a user or provide a valid user ID.');
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

      const leaderboardRank = await statsManager.getUserLeaderboardRank(message.guild.id, targetUser.id);
      
      // Calculate activity level
      const activityLevel = calculateActivityLevel(userStats.messages.total);
      
      // Calculate average messages per day
      const memberDays = Math.max(1, Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24)));
      const avgPerDay = Math.round(userStats.messages.total / memberDays);
      
      const embed = new EmbedBuilder()
        .setTitle(`📋 User Information - ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor('#5865f2')
        .addFields(
          {
            name: '👤 Basic Information',
            value: 
              `**Username:** ${targetUser.username}\n` +
              `**Display Name:** ${member.displayName}\n` +
              `**User ID:** ${targetUser.id}\n` +
              `**Bot:** ${targetUser.bot ? 'Yes ✅' : 'No ❌'}\n` +
              `**Nickname:** ${member.nickname || 'None'}`,
            inline: false
          },
          {
            name: '📅 Dates',
            value: 
              `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n` +
              `**Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` +
              `**Last Active:** <t:${Math.floor(userStats.lastMessageDate.getTime() / 1000)}:R>\n` +
              `**Server Age:** ${memberDays} days`,
            inline: false
          },
          {
            name: '📊 Message Statistics',
            value: 
              `**Total Messages:** ${userStats.messages.total.toLocaleString()}\n` +
              `**This Month:** ${userStats.messages.monthly.toLocaleString()}\n` +
              `**This Week:** ${userStats.messages.weekly.toLocaleString()}\n` +
              `**Today:** ${userStats.messages.daily.toLocaleString()}\n` +
              `**Daily Average:** ${avgPerDay.toLocaleString()}`,
            inline: true
          },
          {
            name: '🏆 Rankings & Activity',
            value: 
              `**Leaderboard Rank:** ${leaderboardRank ? `#${leaderboardRank.rank}` : 'Unranked'}\n` +
              `**Activity Level:** ${activityLevel.emoji} ${activityLevel.name}\n` +
              `**Giveaways Entered:** ${userStats.giveawaysEntered || 0}\n` +
              `**Giveaways Won:** ${userStats.giveawaysWon || 0}\n` +
              `**Voice Time:** ${Math.round(userStats.voiceTime / 60)}h`,
            inline: true
          },
          {
            name: '🎭 Roles',
            value: member.roles.cache
              .filter(role => role.id !== message.guild.id)
              .sort((a, b) => b.position - a.position)
              .map(role => role.toString())
              .slice(0, 10)
              .join(', ') || 'No roles',
            inline: false
          },
          {
            name: '🔐 Permissions',
            value: 
              `**Administrator:** ${member.permissions.has('Administrator') ? '✅' : '❌'}\n` +
              `**Manage Server:** ${member.permissions.has('ManageGuild') ? '✅' : '❌'}\n` +
              `**Manage Channels:** ${member.permissions.has('ManageChannels') ? '✅' : '❌'}\n` +
              `**Kick Members:** ${member.permissions.has('KickMembers') ? '✅' : '❌'}\n` +
              `**Ban Members:** ${member.permissions.has('BanMembers') ? '✅' : '❌'}`,
            inline: false
          }
        )
        .setFooter({ text: `Requested by ${message.author.username}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in userinfo command:', error);
      await message.reply('❌ Error loading user information.');
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
