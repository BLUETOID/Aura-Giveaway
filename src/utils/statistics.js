const { Statistics, UserStats } = require('../database/schemas');
const mongodb = require('../database/mongodb');

const RETENTION_DAYS = 30; // Keep 30 days of data

class StatisticsManager {
  constructor() {
    this.client = null;
    this.voiceSessions = new Map(); // userId -> { joinedAt, channelId, guildId }
  }

  async init(client) {
    this.client = client;
    
    // Ensure MongoDB is connected
    if (!mongodb.isDBConnected()) {
      console.warn('⚠️ MongoDB not connected. Statistics features may not work properly.');
      return;
    }

    console.log('📊 Statistics Manager initialized successfully!');
  }

  async getGuildStats(guildId) {
    try {
      let stats = await Statistics.findOne({ guildId });
      
      if (!stats) {
        stats = new Statistics({ guildId, dailyStats: [] });
        await stats.save();
        console.log(`📊 Created new statistics for guild: ${guildId}`);
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching guild stats:', error.message);
      return null;
    }
  }

  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  async recordMemberJoin(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      todayStats.members.joins++;
      todayStats.members.total++;
      
      stats.lastUpdated = new Date();
      await stats.save();
    } catch (error) {
      console.error('❌ Error recording member join:', error.message);
    }
  }

  async recordMemberLeave(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      todayStats.members.leaves++;
      if (todayStats.members.total > 0) {
        todayStats.members.total--;
      }
      
      stats.lastUpdated = new Date();
      await stats.save();
    } catch (error) {
      console.error('❌ Error recording member leave:', error.message);
    }
  }

  async recordMessage(guildId, channelId = null, userId = null, username = null) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      todayStats.messages.total++;
      
      // Track hourly activity for heat maps
      const currentHour = new Date().getHours();
      if (!todayStats.hourlyActivity) {
        todayStats.hourlyActivity = {
          messages: Array(24).fill(0),
          voiceMinutes: Array(24).fill(0),
          membersOnline: Array(24).fill(0)
        };
      }
      todayStats.hourlyActivity.messages[currentHour]++;
      
      // Track by channel
      if (channelId) {
        const currentCount = todayStats.messages.byChannel.get(channelId) || 0;
        todayStats.messages.byChannel.set(channelId, currentCount + 1);
      }
      
      // Track by user
      if (userId) {
        const currentCount = todayStats.messages.byUser.get(userId) || 0;
        todayStats.messages.byUser.set(userId, currentCount + 1);
      }
      
      stats.lastUpdated = new Date();
      await stats.save();

      // Update user total stats
      if (userId && username) {
        await this.recordUserMessage(guildId, userId, username);
      }
    } catch (error) {
      console.error('❌ Error recording message:', error.message);
    }
  }

  async recordUserMessage(guildId, userId, username) {
    try {
      const now = new Date();
      
      await UserStats.findOneAndUpdate(
        { guildId, userId },
        {
          $inc: {
            'messages.total': 1,
            'messages.daily': 1,
            'messages.weekly': 1,
            'messages.monthly': 1
          },
          $set: {
            username: username,
            lastMessageDate: now,
            isActive: true
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (error) {
      console.error('❌ Error recording user message:', error.message);
    }
  }

  async getUserTotalMessages(guildId, userId) {
    try {
      const userStats = await UserStats.findOne({ guildId, userId });
      return userStats ? userStats.messages.total : 0;
    } catch (error) {
      console.error('❌ Error getting user message count:', error.message);
      return 0;
    }
  }

  async getMessageLeaderboard(guildId, limit = 10, period = 'all') {
    try {
      let sortField;
      switch (period) {
        case 'daily':
          sortField = 'messages.daily';
          break;
        case 'weekly':
          sortField = 'messages.weekly';
          break;
        case 'monthly':
          sortField = 'messages.monthly';
          break;
        default:
          sortField = 'messages.total';
      }

      const users = await UserStats.find({ guildId })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .select('userId username messages lastMessageDate');

      return users.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        username: user.username,
        messages: period === 'all' ? user.messages.total : user.messages[period],
        lastActive: user.lastMessageDate
      }));
    } catch (error) {
      console.error('❌ Error getting message leaderboard:', error.message);
      return [];
    }
  }

  async resetCounters(period) {
    try {
      let updateField;
      switch (period) {
        case 'daily':
          updateField = 'messages.daily';
          break;
        case 'weekly':
          updateField = 'messages.weekly';
          break;
        case 'monthly':
          updateField = 'messages.monthly';
          break;
        default:
          return;
      }

      const result = await UserStats.updateMany(
        {},
        { $set: { [updateField]: 0 } }
      );

      console.log(`✅ Reset ${period} message counters (${result.modifiedCount} users)`);
    } catch (error) {
      console.error(`❌ Error resetting ${period} counters:`, error.message);
    }
  }

  recordVoiceJoin(userId, guildId, channelId) {
    this.voiceSessions.set(userId, {
      joinedAt: Date.now(),
      channelId,
      guildId
    });
  }

  async recordVoiceLeave(userId) {
    const session = this.voiceSessions.get(userId);
    if (!session) return;

    try {
      const duration = Date.now() - session.joinedAt;
      const minutes = Math.round(duration / 60000);
      
      const stats = await this.getGuildStats(session.guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      todayStats.voice.joins++;
      todayStats.voice.leaves++;
      todayStats.voice.totalMinutes += minutes;
      
      stats.lastUpdated = new Date();
      await stats.save();
      
      this.voiceSessions.delete(userId);
    } catch (error) {
      console.error('❌ Error recording voice leave:', error.message);
    }
  }

  async updateMaxOnline(guildId, onlineCount) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      
      if (onlineCount > todayStats.peakOnline) {
        todayStats.peakOnline = onlineCount;
        stats.lastUpdated = new Date();
        await stats.save();
      }
    } catch (error) {
      console.error('❌ Error updating max online:', error.message);
    }
  }

  async getWeeklyStats(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return [];

      return stats.getLastNDaysStats(7);
    } catch (error) {
      console.error('❌ Error fetching weekly stats:', error.message);
      return [];
    }
  }

  async getMonthlyStats(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return [];

      return stats.getLastNDaysStats(30);
    } catch (error) {
      console.error('❌ Error fetching monthly stats:', error.message);
      return [];
    }
  }

  async getTodayStats(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return null;

      return stats.getTodayStatsFlattened();
    } catch (error) {
      console.error('❌ Error fetching today stats:', error.message);
      return null;
    }
  }

  async cleanupOldStats() {
    try {
      const allStats = await Statistics.find();
      let cleanedCount = 0;

      for (const stats of allStats) {
        const initialLength = stats.dailyStats.length;
        await stats.cleanOldStats();
        cleanedCount += initialLength - stats.dailyStats.length;
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old statistic entries (older than ${RETENTION_DAYS} days)`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old stats:', error.message);
      return 0;
    }
  }

  async getAllGuildStats() {
    try {
      return await Statistics.find().sort({ lastUpdated: -1 });
    } catch (error) {
      console.error('❌ Error fetching all guild stats:', error.message);
      return [];
    }
  }

  // ========================================
  // USER PROFILE METHODS
  // ========================================

  async getUserProfile(guildId, userId) {
    try {
      return await UserStats.findOne({ guildId, userId });
    } catch (error) {
      console.error('❌ Error getting user profile:', error.message);
      return null;
    }
  }

  async getUserLeaderboardRank(guildId, userId) {
    try {
      const userStats = await UserStats.findOne({ guildId, userId });
      if (!userStats) return null;

      const usersWithMoreMessages = await UserStats.countDocuments({
        guildId,
        'messages.total': { $gt: userStats.messages.total }
      });

      return {
        rank: usersWithMoreMessages + 1,
        total: userStats.messages.total
      };
    } catch (error) {
      console.error('❌ Error getting user rank:', error.message);
      return null;
    }
  }

  async getUserVoiceRank(guildId, userId) {
    try {
      const userStats = await UserStats.findOne({ guildId, userId });
      if (!userStats) return null;

      const usersWithMoreVoiceTime = await UserStats.countDocuments({
        guildId,
        voiceTime: { $gt: userStats.voiceTime }
      });

      return {
        rank: usersWithMoreVoiceTime + 1,
        total: userStats.voiceTime
      };
    } catch (error) {
      console.error('❌ Error getting user voice rank:', error.message);
      return null;
    }
  }

  async updateUserGiveawayStats(guildId, userId, type = 'entered') {
    try {
      const updateField = type === 'entered' ? 'giveawaysEntered' : 'giveawaysWon';
      
      await UserStats.findOneAndUpdate(
        { guildId, userId },
        { $inc: { [updateField]: 1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('❌ Error updating user giveaway stats:', error.message);
    }
  }

  async getHourlyActivity(guildId, hours = 24) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) {
        return Array.from({ length: hours }, (_, i) => ({
          hour: `${i}:00`,
          messages: 0,
          voiceMinutes: 0
        }));
      }

      // Get the most recent day's hourly data
      const recentDay = stats.dailyStats[stats.dailyStats.length - 1];
      
      if (recentDay && recentDay.hourlyActivity) {
        const result = [];
        for (let i = 0; i < Math.min(hours, 24); i++) {
          result.push({
            hour: `${i}:00`,
            messages: recentDay.hourlyActivity.messages[i] || 0,
            voiceMinutes: recentDay.hourlyActivity.voice[i] || 0
          });
        }
        return result;
      }

      return Array.from({ length: hours }, (_, i) => ({
        hour: `${i}:00`,
        messages: 0,
        voiceMinutes: 0
      }));
    } catch (error) {
      console.error('❌ Error getting hourly activity:', error.message);
      return Array.from({ length: hours }, (_, i) => ({
        hour: `${i}:00`,
        messages: 0,
        voiceMinutes: 0
      }));
    }
  }

  async getActiveMembersCount(guildId, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const count = await UserStats.countDocuments({
        guildId,
        lastMessageDate: { $gte: cutoffDate }
      });

      return count;
    } catch (error) {
      console.error('❌ Error getting active members count:', error.message);
      return 0;
    }
  }

  // ========================================
  // HEAT MAP METHODS
  // ========================================

  async getHeatMapData(guildId, days = 7) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return this.getEmptyHeatMap(days);

      const recentStats = stats.getLastNDaysStats(days);
      const heatMap = [];

      for (let i = 0; i < days; i++) {
        const dayStat = recentStats[i];
        
        // Find the full stat object to get hourly data
        const fullStat = stats.dailyStats.find(s => s.date === dayStat.date);
        
        if (fullStat && fullStat.hourlyActivity && fullStat.hourlyActivity.messages) {
          heatMap.push(fullStat.hourlyActivity.messages);
        } else {
          heatMap.push(Array(24).fill(0));
        }
      }

      return heatMap;
    } catch (error) {
      console.error('❌ Error getting heat map data:', error.message);
      return this.getEmptyHeatMap(days);
    }
  }

  async getVoiceHeatMapData(guildId, days = 7) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return this.getEmptyHeatMap(days);

      const recentStats = stats.getLastNDaysStats(days);
      const heatMap = [];

      for (let i = 0; i < days; i++) {
        const dayStat = recentStats[i];
        const fullStat = stats.dailyStats.find(s => s.date === dayStat.date);
        
        if (fullStat && fullStat.hourlyActivity && fullStat.hourlyActivity.voiceMinutes) {
          heatMap.push(fullStat.hourlyActivity.voiceMinutes);
        } else {
          heatMap.push(Array(24).fill(0));
        }
      }

      return heatMap;
    } catch (error) {
      console.error('❌ Error getting voice heat map data:', error.message);
      return this.getEmptyHeatMap(days);
    }
  }

  getEmptyHeatMap(days) {
    return Array(days).fill().map(() => Array(24).fill(0));
  }

  async getUserActivityPattern(guildId, userId, days = 7) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return { hourly: Array(24).fill(0), daily: Array(7).fill(0) };

      const recentStats = stats.getLastNDaysStats(days);
      const hourlyPattern = Array(24).fill(0);
      const dailyPattern = Array(days).fill(0);

      recentStats.forEach((dayStat, dayIndex) => {
        const fullStat = stats.dailyStats.find(s => s.date === dayStat.date);
        if (fullStat && fullStat.messages.byUser) {
          const userMessages = fullStat.messages.byUser.get(userId) || 0;
          dailyPattern[dayIndex] = userMessages;
        }
      });

      return { hourly: hourlyPattern, daily: dailyPattern };
    } catch (error) {
      console.error('❌ Error getting user activity pattern:', error.message);
      return { hourly: Array(24).fill(0), daily: Array(7).fill(0) };
    }
  }
}

module.exports = StatisticsManager;
