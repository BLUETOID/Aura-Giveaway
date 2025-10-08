const { Statistics } = require('../database/schemas');
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

  async recordMessage(guildId, channelId = null, userId = null) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return;

      const todayStats = stats.getTodayStats();
      todayStats.messages.total++;
      
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
    } catch (error) {
      console.error('❌ Error recording message:', error.message);
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

  async getTodayStats(guildId) {
    try {
      const stats = await this.getGuildStats(guildId);
      if (!stats) return null;

      return stats.getTodayStats();
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
}

module.exports = StatisticsManager;
