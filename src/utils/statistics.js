const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../../data/statistics.json');
const RETENTION_DAYS = 30; // Keep 30 days of data

class StatisticsManager {
  constructor(githubStorage = null) {
    this.client = null;
    this.stats = new Map(); // guildId -> stats object
    this.githubStorage = githubStorage;
    this.voiceSessions = new Map(); // userId -> { joinedAt, channelId }
    this.ensureStorage();
    this.loadStats();
  }

  init(client) {
    this.client = client;
  }

  ensureStorage() {
    const dataDir = path.dirname(STORAGE_PATH);
    
    if (!fs.existsSync(dataDir)) {
      console.log(`📁 Creating data directory: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(STORAGE_PATH)) {
      console.log(`📄 Creating statistics.json: ${STORAGE_PATH}`);
      fs.writeFileSync(STORAGE_PATH, '[]', 'utf8');
    }
  }

  loadStats() {
    try {
      const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          this.stats.set(item.guildId, item);
        }
      }
      console.log(`📊 Loaded statistics for ${this.stats.size} guild(s)`);
    } catch (error) {
      console.error('[StatisticsManager] Failed to load stats:', error);
    }
  }

  saveStats() {
    try {
      const serialized = JSON.stringify([...this.stats.values()], null, 2);
      fs.writeFileSync(STORAGE_PATH, serialized, 'utf8');
      
      // Save to GitHub if enabled
      if (this.githubStorage && this.githubStorage.enabled) {
        const data = [...this.stats.values()];
        this.githubStorage.saveToGitHub(data, 'data/statistics.json').catch(error => {
          console.error('Failed to save stats to GitHub (non-blocking):', error.message);
        });
      }
    } catch (error) {
      console.error('[StatisticsManager] Failed to save stats:', error);
    }
  }

  getGuildStats(guildId) {
    if (!this.stats.has(guildId)) {
      this.stats.set(guildId, {
        guildId,
        dailyStats: {},
        totalStats: {
          totalJoins: 0,
          totalLeaves: 0,
          totalMessages: 0,
          totalVoiceMinutes: 0,
          totalRoleChanges: 0
        },
        lastUpdated: Date.now()
      });
    }
    return this.stats.get(guildId);
  }

  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  getTodayStats(guildId) {
    const guildStats = this.getGuildStats(guildId);
    const todayKey = this.getTodayKey();
    
    if (!guildStats.dailyStats[todayKey]) {
      guildStats.dailyStats[todayKey] = {
        date: todayKey,
        joins: 0,
        leaves: 0,
        messages: 0,
        voiceMinutes: 0,
        maxOnline: 0,
        roleChanges: 0,
        timestamp: Date.now()
      };
    }
    
    return guildStats.dailyStats[todayKey];
  }

  recordMemberJoin(guildId) {
    const todayStats = this.getTodayStats(guildId);
    const guildStats = this.getGuildStats(guildId);
    
    todayStats.joins++;
    guildStats.totalStats.totalJoins++;
    guildStats.lastUpdated = Date.now();
    
    this.saveStats();
  }

  recordMemberLeave(guildId) {
    const todayStats = this.getTodayStats(guildId);
    const guildStats = this.getGuildStats(guildId);
    
    todayStats.leaves++;
    guildStats.totalStats.totalLeaves++;
    guildStats.lastUpdated = Date.now();
    
    this.saveStats();
  }

  recordMessage(guildId) {
    const todayStats = this.getTodayStats(guildId);
    const guildStats = this.getGuildStats(guildId);
    
    todayStats.messages++;
    guildStats.totalStats.totalMessages++;
    guildStats.lastUpdated = Date.now();
    
    this.saveStats();
  }

  recordVoiceJoin(userId, guildId, channelId) {
    this.voiceSessions.set(userId, {
      joinedAt: Date.now(),
      channelId,
      guildId
    });
  }

  recordVoiceLeave(userId) {
    const session = this.voiceSessions.get(userId);
    if (!session) return;

    const duration = Date.now() - session.joinedAt;
    const minutes = Math.round(duration / 60000);
    
    const todayStats = this.getTodayStats(session.guildId);
    const guildStats = this.getGuildStats(session.guildId);
    
    todayStats.voiceMinutes += minutes;
    guildStats.totalStats.totalVoiceMinutes += minutes;
    guildStats.lastUpdated = Date.now();
    
    this.voiceSessions.delete(userId);
    this.saveStats();
  }

  recordRoleChange(guildId) {
    const todayStats = this.getTodayStats(guildId);
    const guildStats = this.getGuildStats(guildId);
    
    todayStats.roleChanges++;
    guildStats.totalStats.totalRoleChanges++;
    guildStats.lastUpdated = Date.now();
    
    this.saveStats();
  }

  updateMaxOnline(guildId, onlineCount) {
    const todayStats = this.getTodayStats(guildId);
    
    if (onlineCount > todayStats.maxOnline) {
      todayStats.maxOnline = onlineCount;
      this.saveStats();
    }
  }

  getWeeklyStats(guildId) {
    const guildStats = this.getGuildStats(guildId);
    const weeklyData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const dayStats = guildStats.dailyStats[dateKey] || {
        date: dateKey,
        joins: 0,
        leaves: 0,
        messages: 0,
        voiceMinutes: 0,
        maxOnline: 0,
        roleChanges: 0
      };
      
      weeklyData.push(dayStats);
    }
    
    return weeklyData;
  }

  cleanupOldStats() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
    
    let cleanedCount = 0;
    
    for (const [guildId, guildStats] of this.stats.entries()) {
      const oldKeys = Object.keys(guildStats.dailyStats).filter(key => key < cutoffKey);
      
      for (const key of oldKeys) {
        delete guildStats.dailyStats[key];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old statistic entries (older than ${RETENTION_DAYS} days)`);
      this.saveStats();
    }
    
    return cleanedCount;
  }
}

module.exports = StatisticsManager;
