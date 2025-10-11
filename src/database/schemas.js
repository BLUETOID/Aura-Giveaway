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
    },
    messageRequirement: {
        enabled: { type: Boolean, default: false },
        count: { type: Number, default: 5 }
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
        peakOnline: { type: Number, default: 0 },
        
        // Hourly activity tracking for heat maps
        hourlyActivity: {
            messages: { 
                type: [mongoose.Schema.Types.Mixed], 
                default: () => Array(24).fill(0) 
            },
            voiceMinutes: { 
                type: [mongoose.Schema.Types.Mixed], 
                default: () => Array(24).fill(0) 
            },
            membersOnline: { 
                type: [mongoose.Schema.Types.Mixed], 
                default: () => Array(24).fill(0) 
            }
        }
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

// Helper method to clean up corrupted hourly activity data
statisticsSchema.methods.cleanCorruptedHourlyData = function() {
    let needsSave = false;
    
    this.dailyStats.forEach(dayStat => {
        if (dayStat.hourlyActivity) {
            // Clean messages array
            if (Array.isArray(dayStat.hourlyActivity.messages)) {
                const cleanedMessages = [];
                for (let i = 0; i < Math.min(dayStat.hourlyActivity.messages.length, 24); i++) {
                    const msg = dayStat.hourlyActivity.messages[i];
                    if (typeof msg === 'number' && !isNaN(msg)) {
                        cleanedMessages[i] = msg;
                    } else {
                        cleanedMessages[i] = 0;
                        needsSave = true;
                    }
                }
                // Ensure we have exactly 24 elements
                while (cleanedMessages.length < 24) {
                    cleanedMessages.push(0);
                }
                dayStat.hourlyActivity.messages = cleanedMessages.slice(0, 24);
            } else {
                dayStat.hourlyActivity.messages = Array(24).fill(0);
                needsSave = true;
            }
            
            // Clean voiceMinutes array
            if (Array.isArray(dayStat.hourlyActivity.voiceMinutes)) {
                const cleanedVoice = [];
                for (let i = 0; i < Math.min(dayStat.hourlyActivity.voiceMinutes.length, 24); i++) {
                    const voice = dayStat.hourlyActivity.voiceMinutes[i];
                    if (typeof voice === 'number' && !isNaN(voice)) {
                        cleanedVoice[i] = voice;
                    } else {
                        cleanedVoice[i] = 0;
                        needsSave = true;
                    }
                }
                while (cleanedVoice.length < 24) {
                    cleanedVoice.push(0);
                }
                dayStat.hourlyActivity.voiceMinutes = cleanedVoice.slice(0, 24);
            } else {
                dayStat.hourlyActivity.voiceMinutes = Array(24).fill(0);
                needsSave = true;
            }
            
            // Clean membersOnline array
            if (Array.isArray(dayStat.hourlyActivity.membersOnline)) {
                const cleanedMembers = [];
                for (let i = 0; i < Math.min(dayStat.hourlyActivity.membersOnline.length, 24); i++) {
                    const members = dayStat.hourlyActivity.membersOnline[i];
                    if (typeof members === 'number' && !isNaN(members)) {
                        cleanedMembers[i] = members;
                    } else {
                        cleanedMembers[i] = 0;
                        needsSave = true;
                    }
                }
                while (cleanedMembers.length < 24) {
                    cleanedMembers.push(0);
                }
                dayStat.hourlyActivity.membersOnline = cleanedMembers.slice(0, 24);
            } else {
                dayStat.hourlyActivity.membersOnline = Array(24).fill(0);
                needsSave = true;
            }
        } else {
            // Initialize missing hourlyActivity
            dayStat.hourlyActivity = {
                messages: Array(24).fill(0),
                voiceMinutes: Array(24).fill(0),
                membersOnline: Array(24).fill(0)
            };
            needsSave = true;
        }
    });
    
    return needsSave;
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
// USER STATISTICS SCHEMA
// ========================================

const userStatsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    
    // Message statistics
    messages: {
        total: { type: Number, default: 0 },
        daily: { type: Number, default: 0 },
        weekly: { type: Number, default: 0 },
        monthly: { type: Number, default: 0 }
    },
    
    // Activity tracking
    lastMessageDate: { type: Date, default: Date.now },
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    
    // Other stats
    voiceTime: { type: Number, default: 0 }, // Total minutes
    giveawaysEntered: { type: Number, default: 0 },
    giveawaysWon: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Compound index for efficient queries
userStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userStatsSchema.index({ guildId: 1, 'messages.total': -1 }); // For leaderboard
userStatsSchema.index({ lastMessageDate: -1 }); // For activity checks

// ========================================
// EXPORT MODELS
// ========================================

const Giveaway = mongoose.model('Giveaway', giveawaySchema);
const Statistics = mongoose.model('Statistics', statisticsSchema);
const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = {
    Giveaway,
    Statistics,
    UserStats
};
