const mongoose = require('mongoose');

// ========================================
// GIVEAWAY SCHEMA
// ========================================

const giveawaySchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    channelId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    hostId: {
        type: String,
        required: true
    },
    prize: {
        type: String,
        required: true
    },
    winnerCount: {
        type: Number,
        required: true,
        min: 1
    },
    endTime: {
        type: Date,
        required: true,
        index: true
    },
    entries: [{
        type: String
    }],
    ended: {
        type: Boolean,
        default: false,
        index: true
    },
    winners: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for querying active giveaways
giveawaySchema.index({ ended: 1, endTime: 1 });

// Index for guild-specific queries
giveawaySchema.index({ guildId: 1, ended: 1 });

// ========================================
// STATISTICS SCHEMA
// ========================================

const statisticsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    dailyStats: [{
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true
        },
        members: {
            joins: { type: Number, default: 0 },
            leaves: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        messages: {
            total: { type: Number, default: 0 },
            byChannel: {
                type: Map,
                of: Number,
                default: new Map()
            },
            byUser: {
                type: Map,
                of: Number,
                default: new Map()
            }
        },
        voice: {
            joins: { type: Number, default: 0 },
            leaves: { type: Number, default: 0 },
            activeUsers: {
                type: Map,
                of: {
                    userId: String,
                    channelId: String,
                    joinTime: Date
                },
                default: new Map()
            },
            totalMinutes: { type: Number, default: 0 }
        },
        peakOnline: { type: Number, default: 0 }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for date-based queries
statisticsSchema.index({ 'dailyStats.date': 1 });

// Automatically clean up old statistics (older than 30 days)
statisticsSchema.methods.cleanOldStats = function() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    this.dailyStats = this.dailyStats.filter(stat => stat.date >= cutoffDate);
    return this.save();
};

// Helper method to get today's stats
statisticsSchema.methods.getTodayStats = function() {
    const today = new Date().toISOString().split('T')[0];
    let todayStats = this.dailyStats.find(stat => stat.date === today);
    
    if (!todayStats) {
        todayStats = {
            date: today,
            members: { joins: 0, leaves: 0, total: 0 },
            messages: { total: 0, byChannel: new Map(), byUser: new Map() },
            voice: { joins: 0, leaves: 0, activeUsers: new Map(), totalMinutes: 0 },
            peakOnline: 0
        };
        this.dailyStats.push(todayStats);
    }
    
    return todayStats;
};

// Helper method to get flattened today's stats for display
statisticsSchema.methods.getTodayStatsFlattened = function() {
    const todayStats = this.getTodayStats();
    
    return {
        date: todayStats.date,
        joins: todayStats.members?.joins || 0,
        leaves: todayStats.members?.leaves || 0,
        messages: todayStats.messages?.total || 0,
        voiceMinutes: todayStats.voice?.totalMinutes || 0,
        maxOnline: todayStats.peakOnline || 0
    };
};

// Helper method to get stats for last N days
statisticsSchema.methods.getLastNDaysStats = function(days = 7) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates.map(date => {
        const stat = this.dailyStats.find(s => s.date === date);
        if (!stat) {
            return {
                date,
                joins: 0,
                leaves: 0,
                messages: 0,
                voiceMinutes: 0,
                maxOnline: 0
            };
        }
        
        // Return flattened version for easier access
        return {
            date: stat.date,
            joins: stat.members?.joins || 0,
            leaves: stat.members?.leaves || 0,
            messages: stat.messages?.total || 0,
            voiceMinutes: stat.voice?.totalMinutes || 0,
            maxOnline: stat.peakOnline || 0
        };
    });
};

// Virtual property to calculate all-time totals from daily stats
statisticsSchema.virtual('totalStats').get(function() {
    const totals = {
        totalJoins: 0,
        totalLeaves: 0,
        totalMessages: 0,
        totalVoiceMinutes: 0
    };
    
    this.dailyStats.forEach(day => {
        totals.totalJoins += day.members?.joins || 0;
        totals.totalLeaves += day.members?.leaves || 0;
        totals.totalMessages += day.messages?.total || 0;
        totals.totalVoiceMinutes += day.voice?.totalMinutes || 0;
    });
    
    return totals;
});

// ========================================
// EXPORT MODELS
// ========================================

const Giveaway = mongoose.model('Giveaway', giveawaySchema);
const Statistics = mongoose.model('Statistics', statisticsSchema);

module.exports = {
    Giveaway,
    Statistics
};
