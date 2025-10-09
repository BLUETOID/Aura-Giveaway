# MongoDB Atlas Complete Guide

## 📊 Your Current Data Retention Policy

### **Statistics Data**
- **Retention Period**: 30 days
- **What's Saved**: Daily member joins/leaves, messages, voice activity, peak online counts
- **Auto-Cleanup**: Runs every 24 hours + on bot startup
- **Data Location**: `Statistics` collection in `aura-bot` database

### **Giveaway Data**
- **Retention Period**: 7 days (after giveaway ends)
- **What's Saved**: All giveaway details, entries, winners
- **Auto-Cleanup**: Runs every 24 hours + on bot startup
- **Data Location**: `Giveaway` collection in `aura-bot` database

### **✅ Data Persistence Guaranteed**
Your data is **permanently saved in MongoDB Atlas** and will:
- ✅ Survive Heroku daily restarts (Heroku restarts don't affect MongoDB)
- ✅ Persist even if your bot goes offline
- ✅ Be available across multiple servers if needed
- ✅ Only be deleted based on retention policies above

---

## 🔧 How to Access MongoDB Atlas Website

### **1. Login to MongoDB Atlas**
1. Go to: https://cloud.mongodb.com/
2. Login with your credentials
3. You'll see your project dashboard

### **2. Navigate to Your Database**
1. Click on **"Database"** in the left sidebar
2. Click **"Browse Collections"** on your cluster
3. You'll see:
   - Database: `aura-bot`
   - Collections: `giveaways`, `statistics`

---

## 📈 What You Can Do on MongoDB Atlas Website

### **1. View Your Data (Browse Collections)**
```
Database → Browse Collections → Select Collection
```
- **View all documents**: See every statistic and giveaway record
- **Search/Filter**: Find specific data by guild ID, date, etc.
- **Real-time updates**: See data as your bot adds it

**Example Queries:**
```javascript
// Find stats for a specific guild
{ "guildId": "669958524440281118" }

// Find all active giveaways
{ "ended": false }

// Find stats from a specific date
{ "dailyStats.date": "2025-10-08" }
```

### **2. Monitor Performance**
```
Database → Metrics Tab
```
- **Connection stats**: See how many connections your bot uses
- **Query performance**: Find slow queries
- **Storage usage**: Track how much space your data uses
- **Operation counts**: See reads/writes per second

### **3. Set Up Alerts**
```
Database → Alerts Tab → Create Alert
```
Useful alerts to set up:
- **Storage usage > 80%**: Get notified before running out of space
- **Connection spike**: Detect unusual activity
- **Slow queries**: Find performance issues
- **Replication lag**: Ensure data is backed up properly

### **4. Create Backups**
```
Database → Backup Tab
```
- **Cloud Backup**: Automatic daily backups (enabled by default on M10+)
- **On-Demand Snapshots**: Create manual backups before major changes
- **Point-in-Time Recovery**: Restore to any moment in the last 24 hours

**Note**: Free tier (M0) has limited backup options. Consider upgrading for automatic backups.

### **5. Analyze Query Performance**
```
Database → Performance Advisor
```
- **Index recommendations**: Suggestions to speed up queries
- **Slow query logs**: Find queries taking >100ms
- **Query patterns**: See most common operations

### **6. Data Visualization**
```
Charts → Create Dashboard
```
Create visual charts of your data:
- **Member growth over time**: Line chart of joins/leaves
- **Message activity heatmap**: When your server is most active
- **Giveaway participation**: Bar chart of entries per giveaway

---

## 🛡️ Security Best Practices

### **Current Security Settings**
✅ IP Whitelist: `0.0.0.0/0` (allows Heroku dynamic IPs)
✅ Database user: `aura-utility` with read/write permissions
✅ Connection string: Stored securely in Heroku config vars

### **Recommended Enhancements**
1. **Enable Database Auditing** (M10+ clusters)
   - Track who accesses what data
   - Monitor for suspicious activity

2. **Enable Encryption at Rest** (M10+ clusters)
   - Extra layer of security for stored data

3. **Set Up Network Peering** (For advanced users)
   - Direct private connection between Heroku and MongoDB

---

## 📊 Understanding Your Data Structure

### **Statistics Collection**
```javascript
{
  _id: ObjectId("..."),
  guildId: "669958524440281118",
  dailyStats: [
    {
      date: "2025-10-08",
      members: {
        joins: 5,
        leaves: 2,
        total: 56764
      },
      messages: {
        total: 1234,
        byChannel: Map { "channel_id" => 100 },
        byUser: Map { "user_id" => 50 }
      },
      voice: {
        joins: 10,
        leaves: 8,
        totalMinutes: 450
      },
      peakOnline: 5000
    }
    // ... more daily stats (up to 30 days)
  ],
  lastUpdated: ISODate("2025-10-08T12:00:00Z"),
  createdAt: ISODate("2025-10-08T00:00:00Z"),
  updatedAt: ISODate("2025-10-08T12:00:00Z")
}
```

### **Giveaways Collection**
```javascript
{
  _id: ObjectId("..."),
  messageId: "1234567890123456789",
  channelId: "987654321098765432",
  guildId: "669958524440281118",
  hostId: "111222333444555666",
  prize: "Discord Nitro",
  winnerCount: 3,
  endTime: ISODate("2025-10-09T12:00:00Z"),
  entries: ["user1", "user2", "user3"],
  ended: false,
  winners: [],
  createdAt: ISODate("2025-10-08T10:00:00Z"),
  updatedAt: ISODate("2025-10-08T10:00:00Z")
}
```

---

## 🚀 Advanced MongoDB Features You Can Use

### **1. Create Custom Indexes for Faster Queries**
Your bot already has these indexes:
```javascript
// Giveaways
{ guildId: 1, ended: 1 }  // Find active giveaways by guild
{ messageId: 1 }           // Lookup giveaway by message

// Statistics  
{ guildId: 1 }             // Find stats by guild
{ "dailyStats.date": 1 }   // Find stats by date
```

### **2. Aggregation Pipelines (Advanced Analytics)**
You can run custom queries directly in MongoDB Atlas:

**Example: Get total messages across all guilds**
```javascript
db.statistics.aggregate([
  { $unwind: "$dailyStats" },
  { $group: {
      _id: null,
      totalMessages: { $sum: "$dailyStats.messages.total" }
  }}
])
```

**Example: Top 5 most active days**
```javascript
db.statistics.aggregate([
  { $unwind: "$dailyStats" },
  { $sort: { "dailyStats.messages.total": -1 }},
  { $limit: 5 },
  { $project: {
      date: "$dailyStats.date",
      messages: "$dailyStats.messages.total"
  }}
])
```

### **3. Data Export**
```
Database → Browse Collections → Export Collection
```
Formats available:
- **JSON**: For backup or analysis
- **CSV**: For spreadsheets
- **BSON**: For MongoDB imports

### **4. Database Triggers (Automation)**
```
Database → Triggers → Add Trigger
```
Examples:
- Send webhook when giveaway ends
- Alert when daily messages drop significantly
- Auto-archive old data to cheaper storage

---

## 💰 Storage Usage Optimization

### **Current Free Tier Limits**
- **Storage**: 512 MB
- **RAM**: 512 MB
- **Connections**: 500 concurrent

### **How to Monitor Usage**
1. Go to **Database → Data Size**
2. Check:
   - Total storage used
   - Storage per collection
   - Index size

### **If You're Running Low on Space**

#### **Option 1: Reduce Retention Periods**
Edit `src/database/schemas.js`:
```javascript
// Reduce from 30 to 14 days
const fourteenDaysAgo = new Date();
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
```

#### **Option 2: Disable Channel/User Tracking**
Statistics currently track messages by channel and user. If you don't need this granularity, you can remove:
```javascript
// In your stats tracking, remove:
byChannel: Map
byUser: Map
```

#### **Option 3: Upgrade to Paid Tier**
- **M10 Cluster**: $0.08/hour (~$57/month)
  - 10 GB storage
  - Automated backups
  - Better performance

---

## 📱 Mobile Access

### **MongoDB Atlas Mobile App**
1. Download from App Store/Play Store
2. Login with your credentials
3. View data, metrics, and alerts on the go

---

## 🔔 Useful Alerts to Set Up

1. **Storage Alert**
   - Metric: Data Size
   - Condition: > 400 MB (80% of free tier)
   - Action: Email notification

2. **Connection Alert**
   - Metric: Connections
   - Condition: > 400 (80% of limit)
   - Action: Email notification

3. **Query Performance Alert**
   - Metric: Query Execution Time
   - Condition: > 1000ms
   - Action: Email notification

---

## 🎯 Quick Actions Checklist

- [ ] **Set up storage alert** (80% threshold)
- [ ] **Enable 2FA on MongoDB Atlas account**
- [ ] **Review query performance** (check slow queries)
- [ ] **Export first backup** (manual export)
- [ ] **Set up mobile app** (for monitoring on the go)
- [ ] **Review data retention** (adjust if needed)
- [ ] **Create a Chart dashboard** (visualize your data)

---

## 🆘 Troubleshooting

### **"Connection timed out"**
- Check IP whitelist includes `0.0.0.0/0`
- Verify Heroku config var `MONGODB_URI` is correct
- Check MongoDB Atlas cluster is running (not paused)

### **"Authentication failed"**
- Verify database user credentials
- Check password doesn't contain special characters that need URL encoding
- Ensure user has `readWrite` role on `aura-bot` database

### **"Disk full" errors**
- Check storage usage in Atlas dashboard
- Run cleanup manually: Restart bot to trigger cleanup
- Reduce retention period if needed

---

## 📚 Additional Resources

- **MongoDB University**: Free courses at https://university.mongodb.com/
- **Atlas Documentation**: https://docs.atlas.mongodb.com/
- **Support**: https://support.mongodb.com/ (M10+ clusters)
- **Community Forums**: https://www.mongodb.com/community/forums/

---

## 🔒 Your Current Configuration Summary

```yaml
Cluster: aura-utility.maastcd.mongodb.net
Database: aura-bot
Collections:
  - giveaways (7-day retention for ended giveaways)
  - statistics (30-day retention for daily stats)

Retention Policy:
  - Statistics: 30 days of daily data
  - Giveaways: 7 days after ending
  
Cleanup Schedule:
  - Initial: On bot startup
  - Recurring: Every 24 hours

Data Safety:
  ✅ Persists through Heroku restarts
  ✅ Persists through bot downtime
  ✅ Independent of Heroku filesystem
  ✅ Automatically cleaned based on age
```

---

**Last Updated**: October 8, 2025  
**Bot Version**: Heroku v49  
**MongoDB Atlas Cluster**: M0 (Free Tier)
