# MongoDB Atlas Quick Commands & Tips

## 🚀 Quick Access

### **Login to MongoDB Atlas**
```
URL: https://cloud.mongodb.com/
Database: aura-bot
Cluster: aura-utility.maastcd.mongodb.net
```

---

## 📊 Useful MongoDB Queries (Run in Atlas)

### **View All Statistics for a Guild**
```javascript
// Replace with your guild ID
db.statistics.findOne({ "guildId": "669958524440281118" })
```

### **Get Total Messages Across All Days**
```javascript
db.statistics.aggregate([
  { $match: { "guildId": "669958524440281118" } },
  { $unwind: "$dailyStats" },
  { $group: {
      _id: "$guildId",
      totalMessages: { $sum: "$dailyStats.messages.total" },
      totalJoins: { $sum: "$dailyStats.members.joins" },
      totalLeaves: { $sum: "$dailyStats.members.leaves" }
  }}
])
```

### **Find Most Active Day**
```javascript
db.statistics.aggregate([
  { $unwind: "$dailyStats" },
  { $sort: { "dailyStats.messages.total": -1 } },
  { $limit: 1 },
  { $project: {
      date: "$dailyStats.date",
      messages: "$dailyStats.messages.total",
      guildId: 1
  }}
])
```

### **Count Active Giveaways**
```javascript
db.giveaways.countDocuments({ "ended": false })
```

### **Find All Ended Giveaways with Winners**
```javascript
db.giveaways.find({ 
  "ended": true,
  "winners": { $ne: [] }
}).sort({ "endTime": -1 })
```

### **Get Average Giveaway Entries**
```javascript
db.giveaways.aggregate([
  { $project: {
      prize: 1,
      entryCount: { $size: "$entries" }
  }},
  { $group: {
      _id: null,
      avgEntries: { $avg: "$entryCount" },
      maxEntries: { $max: "$entryCount" },
      minEntries: { $min: "$entryCount" }
  }}
])
```

---

## 🎨 MongoDB Atlas Charts Examples

### **Chart 1: Member Growth Over Time**
```
Chart Type: Line Chart
X-axis: dailyStats.date
Y-axis: dailyStats.members.joins (sum)
Series: dailyStats.members.leaves (sum)
```

### **Chart 2: Message Activity Heatmap**
```
Chart Type: Heat Map
X-axis: dailyStats.date
Y-axis: Hour (extracted from timestamp)
Color: dailyStats.messages.total
```

### **Chart 3: Giveaway Popularity**
```
Chart Type: Bar Chart
X-axis: prize
Y-axis: Size of entries array
Sort: Descending by entry count
```

---

## 🔧 Heroku Commands for Data Management

### **Check MongoDB Connection**
```bash
heroku logs --app aura-utility --tail | grep "MongoDB"
```

### **View Recent Statistics**
```bash
heroku logs --app aura-utility --tail | grep "📊"
```

### **Force Data Cleanup**
```bash
heroku restart --app aura-utility
# Cleanup runs automatically on startup
```

### **Check Current Config**
```bash
heroku config --app aura-utility | grep MONGODB
```

---

## 📈 Storage Monitoring

### **Check Storage Usage via Atlas**
1. Go to MongoDB Atlas Dashboard
2. Click on your cluster
3. Go to **Metrics** tab
4. View **Data Size** chart

### **Estimate Your Current Usage**
```javascript
// Run in Atlas
db.statistics.stats().size + db.giveaways.stats().size
// Result in bytes
```

### **Calculate Days Until Storage Full**
```javascript
// Free tier: 512 MB = 536,870,912 bytes
// If your current usage is X bytes:
const currentSize = X; // Get from stats above
const maxSize = 536870912; // 512 MB
const dailyGrowth = 15000; // ~15 KB per day (3 guilds)

const daysRemaining = (maxSize - currentSize) / dailyGrowth;
console.log(`Days until full: ${Math.floor(daysRemaining)}`);
```

---

## 🗑️ Manual Data Cleanup (If Needed)

### **Delete Old Statistics Manually**
```javascript
// Delete stats older than 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

db.statistics.updateMany(
  {},
  {
    $pull: {
      dailyStats: {
        date: { $lt: thirtyDaysAgo.toISOString().split('T')[0] }
      }
    }
  }
)
```

### **Delete Old Giveaways Manually**
```javascript
// Delete ended giveaways older than 7 days
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

db.giveaways.deleteMany({
  ended: true,
  endTime: { $lt: sevenDaysAgo }
})
```

### **Clear All Data (DANGER!)**
```javascript
// Only use if you want to start fresh
db.statistics.deleteMany({})  // Deletes all statistics
db.giveaways.deleteMany({})   // Deletes all giveaways
```

---

## 🔍 Data Validation Queries

### **Check for Missing Daily Stats**
```javascript
db.statistics.find({
  $or: [
    { dailyStats: { $size: 0 } },
    { dailyStats: { $exists: false } }
  ]
})
```

### **Find Giveaways Without Entries**
```javascript
db.giveaways.find({
  ended: false,
  entries: { $size: 0 }
})
```

### **Verify Data Integrity**
```javascript
// Check for statistics with invalid dates
db.statistics.find({
  "dailyStats.date": { $not: /^\d{4}-\d{2}-\d{2}$/ }
})
```

---

## 📊 Export Data for Analysis

### **Export Statistics to JSON**
```bash
# In MongoDB Atlas
1. Database → Browse Collections
2. Select "statistics" collection  
3. Click "Export Collection"
4. Choose "Export to JSON"
5. Download file
```

### **Export for Excel/Google Sheets**
```bash
# Same steps but choose CSV format
1. Export Collection
2. Choose "Export to CSV"
3. Import into Excel/Sheets
```

---

## 🎯 Performance Optimization

### **Create Additional Indexes**
```javascript
// Speed up giveaway lookups by guild
db.giveaways.createIndex({ "guildId": 1, "ended": 1 })

// Speed up stats queries by date range
db.statistics.createIndex({ "dailyStats.date": -1 })
```

### **Analyze Slow Queries**
```bash
# In MongoDB Atlas
1. Go to Performance Advisor
2. Review "Slow Queries" tab
3. Check recommended indexes
```

---

## 🔔 Recommended Atlas Alerts

### **Storage Alert**
```
Alert Type: Data Size
Condition: > 400 MB (80% of free tier)
Notification: Email
Action: Consider cleanup or upgrade
```

### **Connection Alert**  
```
Alert Type: Connections
Condition: > 450 (90% of limit)
Notification: Email
Action: Check for connection leaks
```

### **Query Performance Alert**
```
Alert Type: Query Targeting
Condition: Scanned/Returned Ratio > 1000
Notification: Email  
Action: Add indexes
```

---

## 💡 Pro Tips

### **Tip 1: Regular Exports**
- Export your data monthly as backup
- Store exports in Google Drive/Dropbox
- Helps recover from accidental deletions

### **Tip 2: Monitor Growth**
- Check storage weekly
- If growing too fast, adjust retention periods
- Consider archiving old data externally

### **Tip 3: Use Aggregations**
- MongoDB aggregations are powerful
- Can generate complex reports
- Faster than querying in JavaScript

### **Tip 4: Index Wisely**
- Only index frequently queried fields
- Too many indexes slow down writes
- Your current indexes are sufficient

### **Tip 5: Test Queries First**
- Always test on small datasets
- Use `limit()` when exploring data
- Backup before bulk operations

---

## 🆘 Emergency Recovery

### **If You Accidentally Delete Data**
1. **Stop the bot immediately**: `heroku scale worker=0 --app aura-utility`
2. **Check if you have a recent export**
3. **Contact MongoDB support** (if paid tier)
4. **Restore from backup** (if available)

### **If Storage is Full**
1. Run manual cleanup (see above)
2. Delete old giveaways manually
3. Reduce retention from 30 to 14 days
4. Export and delete historical data

### **If Connection Fails**
1. Check Heroku config: `heroku config --app aura-utility`
2. Verify IP whitelist in Atlas
3. Test connection from local machine
4. Check MongoDB Atlas status page

---

## 📚 Learning Resources

### **MongoDB University** (Free Courses)
- M001: MongoDB Basics
- M121: Aggregation Framework  
- M201: Performance Optimization
- URL: https://university.mongodb.com/

### **MongoDB Documentation**
- Atlas Docs: https://docs.atlas.mongodb.com/
- Query Reference: https://docs.mongodb.com/manual/reference/
- Aggregation: https://docs.mongodb.com/manual/aggregation/

### **Community**
- MongoDB Forums: https://www.mongodb.com/community/forums/
- Stack Overflow: Tag [mongodb-atlas]
- Discord: MongoDB Community Server

---

**Last Updated**: October 8, 2025  
**Your Cluster**: aura-utility (M0 Free Tier)  
**Your Database**: aura-bot
