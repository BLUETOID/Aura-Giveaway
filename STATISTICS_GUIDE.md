# 📊 Server Statistics System - Complete Guide

## Overview

The Aura Utility Bot now includes a comprehensive server statistics tracking system that automatically monitors and analyzes your Discord server's activity in real-time.

## Features

### 📈 What Gets Tracked

- **👥 Member Activity**
  - Member joins (when someone joins the server)
  - Member leaves (when someone leaves the server)
  - Net growth (joins - leaves)
  - Growth rate percentage

- **💬 Message Activity**
  - Total messages sent
  - Hourly and daily averages
  - Peak activity times
  - 7-day trends with charts

- **🎤 Voice Activity**
  - Voice channel join/leave tracking
  - Session duration calculation
  - Total voice minutes/hours
  - Daily and weekly summaries

- **🟢 Online Presence**
  - Maximum concurrent online members
  - Tracked every 5 minutes
  - Peak times identification

- **🎭 Role Changes**
  - Role assignments and removals
  - Total change count
  - Activity trends

### 📅 Data Retention

- **Daily Statistics**: Current day's data (resets at midnight UTC)
- **Historical Data**: 30 days of past statistics
- **Automatic Cleanup**: Data older than 30 days is automatically purged
- **GitHub Backup**: All statistics automatically synced to GitHub for persistence

## Commands

### Slash Commands (Recommended)

#### `/stats overview`
Quick snapshot of today's server statistics including:
- Total members and current online count
- Today's joins and leaves with net growth
- Message count and voice activity hours
- Role changes
- All-time totals

#### `/stats daily`
Detailed breakdown of daily activity with:
- Progress bars for message activity
- Hourly averages
- Net member growth
- Voice activity in hours and minutes
- Role change summary

#### `/stats weekly`
7-day summary featuring:
- Mini trend charts (▁▂▃▄▅▆▇█)
- Total joins, leaves, and net growth
- Message activity trends
- Voice usage patterns
- Peak online counts
- Daily averages

#### `/stats members`
Member growth analytics including:
- Current member count and growth rate
- 7-day join/leave statistics
- Retention percentage
- Day-by-day breakdown with emoji indicators (📈📉➖)
- All-time join/leave totals

#### `/stats activity`
Server engagement metrics showing:
- Message activity with charts
- Voice activity breakdown
- Role change statistics
- Online activity peaks
- All-time totals

### Prefix Commands

All commands also available with prefix (default `!`):

- `!stats overview`
- `!stats daily`
- `!stats weekly`
- `!stats members`
- `!stats activity`

## How It Works

### Automatic Tracking

The bot automatically tracks events in real-time:

1. **Member Events**
   - Fires when someone joins or leaves
   - Increments daily counter
   - Updates all-time totals

2. **Message Events**
   - Every non-bot message tracked
   - Excludes commands from count
   - Tracks across all channels

3. **Voice Events**
   - Join: Records timestamp when user enters voice
   - Leave: Calculates session duration
   - Accumulates total voice minutes

4. **Role Events**
   - Detects role additions/removals
   - Tracks count of changes

5. **Online Tracking**
   - Updates every 5 minutes
   - Records if current count exceeds previous peak
   - Tracks maximum concurrent users

### Data Storage

```
data/
  statistics.json  ← All stats stored here
```

**Structure:**
```json
{
  "guildId": {
    "dailyStats": {
      "2025-01-15": {
        "joins": 10,
        "leaves": 3,
        "messages": 1450,
        "voiceMinutes": 360,
        "maxOnline": 85,
        "roleChanges": 12
      }
    },
    "totalStats": {
      "totalJoins": 1500,
      "totalLeaves": 250,
      "totalMessages": 150000,
      "totalVoiceMinutes": 45000,
      "totalRoleChanges": 320
    }
  }
}
```

### GitHub Persistence

- Statistics automatically backed up to GitHub repository
- Survives Heroku dyno restarts
- Same repository as giveaways (`GITHUB_REPO` environment variable)
- File path: `data/statistics.json`

## Visual Features

### Progress Bars
```
Messages: [████████░░] 80%
```
Shows progress toward daily goals

### Mini Charts
```
Weekly Messages: ▁▂▃▅▇█▆▄
```
Visual representation of 7-day trends using Unicode bars

### Emoji Indicators
- 📈 Positive growth
- 📉 Negative growth
- ➖ No change
- 🟢 Online/Active
- 📥 Joins
- 📤 Leaves

## Permissions

### Required Discord Intents
The bot needs these intents enabled in Discord Developer Portal:

- ✅ **Guilds** - Basic server info
- ✅ **Guild Members** - Track joins/leaves (PRIVILEGED)
- ✅ **Guild Messages** - Count messages
- ✅ **Message Content** - Process commands
- ✅ **Guild Voice States** - Track voice activity
- ✅ **Guild Presences** - Track online status (PRIVILEGED)

### Command Permissions
- Requires: **Manage Server** permission
- Available to: Administrators and members with Manage Server role

## Use Cases

### Server Growth Analysis
Track your server's growth over time:
- Are you gaining or losing members?
- What's your retention rate?
- Which days see the most activity?

### Activity Monitoring
Understand your community's engagement:
- When are peak activity hours?
- How much voice activity happens?
- Are messages increasing or decreasing?

### Moderation Insights
Help with moderation decisions:
- Identify sudden spikes in joins (potential raids)
- Track role changes for auditing
- Monitor overall server health

### Community Reports
Share stats with your community:
- Weekly recap announcements
- Growth milestones
- Engagement achievements

## Technical Details

### Timezone
- All statistics use **UTC timezone**
- Daily resets occur at **00:00 UTC** (midnight)
- Week starts on **Monday**

### Performance
- Lightweight tracking (< 1ms per event)
- Efficient memory usage
- No impact on bot responsiveness
- Async GitHub saves (non-blocking)

### Reliability
- Automatic error handling
- Graceful degradation if GitHub unavailable
- Data validation on load
- Corrupt data recovery

## Troubleshooting

### Statistics Not Updating?

**Check Intents:**
Ensure these are enabled in [Discord Developer Portal](https://discord.com/developers/applications):
- Server Members Intent (PRIVILEGED)
- Presence Intent (PRIVILEGED)

**Verify Permissions:**
Bot needs these server permissions:
- View Channels
- Read Message History

### Data Not Persisting?

**Check Environment Variables:**
```bash
heroku config --app aura-utility
```

Ensure these are set:
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `GITHUB_REPO` - Your repository (BLUETOID/Aura-Giveaway)
- `GITHUB_BRANCH` - Branch name (main)

**Check Logs:**
```bash
heroku logs --tail --app aura-utility
```

Look for:
- ✅ "Statistics Manager initialized successfully!"
- ✅ "GitHub storage enabled: BLUETOID/Aura-Giveaway"

### Commands Not Working?

**Re-deploy Commands:**
```bash
npm run deploy-commands
```

**Check Permissions:**
User needs **Manage Server** permission

**Try Slash Commands:**
Prefix commands might be disabled. Use `/stats` instead.

## Examples

### Daily Standup
Check server health every morning:
```
/stats overview
```

### Weekly Report
Generate community recap every Monday:
```
/stats weekly
```

### Growth Analysis
Track member growth trends:
```
/stats members
```

### Activity Review
Analyze engagement patterns:
```
/stats activity
```

## Roadmap

Potential future enhancements:
- [ ] Custom date range queries
- [ ] Export statistics to CSV/Excel
- [ ] Graphical charts (images)
- [ ] Channel-specific statistics
- [ ] User leaderboards (most active)
- [ ] Comparative analytics (month-over-month)
- [ ] Custom stat goals/milestones
- [ ] Automated weekly reports
- [ ] Integration with Discord webhooks

## Support

Having issues? Check:
1. Bot has proper Discord intents enabled
2. GitHub environment variables are set correctly
3. User has Manage Server permission
4. Commands were deployed (`npm run deploy-commands`)

Still stuck? Check the logs:
```bash
heroku logs --tail --app aura-utility | grep -i "stat"
```

---

**Made with ❤️ for server owners who love data!**
