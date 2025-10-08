# Aura Giveaway Bot 🎉 - Heroku Ready 🚀

A feature-rich Discord giveaway bot with reaction-based entry system and comprehensive admin controls. Ready for instant deployment to Heroku with zero configuration needed!

**Repository:** `BLUETOID/Aura-Giveaway`  
**GitHub:** https://github.com/BLUETOID/Aura-Giveaway

## ✨ Features

- **🎉 Reaction-Based Giveaways**: Users react with 🎉 emoji to enter (no buttons!)
- **👑 Admin Management**: Check entries and remove participants with dedicated buttons
- **🎯 Role-Based Permissions**: Configurable allowed roles beyond just admins
- **🏆 Multiple Winners**: Support for selecting 1-50 winners per giveaway
- **📊 Real-time Updates**: Live entry count with visual emoji feedback
- **⚡ Slash & Prefix Commands**: Complete command parity (`/giveaway` & `!giveaway`)
- **🔒 Auto Role Checking**: Automatic enforcement of role requirements
- **📈 Server Statistics**: Comprehensive tracking of joins, leaves, messages, voice activity, and more
- **🛡️ Moderation Tools**: Full moderation suite with warn, kick, ban, timeout, and purge
- **💾 GitHub Persistence**: All data automatically backed up to GitHub (no database needed)
- **☁️ Heroku Ready**: One-click deployment with Procfile and auto-scaling

## 🚀 Quick Heroku Deployment

### Prerequisites
- [Heroku Account](https://signup.heroku.com/) (free tier available)
- Discord Bot Application with these intents enabled:
  - **Message Content Intent**
  - **Server Members Intent**

### One-Click Deploy
### One-Click Deploy
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/BLUETOID/Aura-Giveaway)

### Manual Heroku Setup

#### Step 1: Create Heroku App
```bash
# Using Heroku CLI
heroku create your-bot-name
```
Or use the [Heroku Dashboard](https://dashboard.heroku.com/apps) web interface.

#### Step 2: Set Environment Variables
In your Heroku app dashboard → Settings → Config Vars, add:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal | `NzIwMjU5NjQ5NTAwMjE3MzY2.GMoI9J...` |
| `DISCORD_CLIENT_ID` | ✅ | Bot's client ID | `720259649500217366` |
| `DISCORD_GUILD_ID` | ❌ | Server ID (faster command deployment) | `731751756224135309` |
| `COMMAND_PREFIX` | ❌ | Prefix for text commands | `!` (default) |
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO` | ✅ | GitHub repository (owner/repo) | `BLUETOID/Aura-Giveaway` |
| `GITHUB_BRANCH` | ❌ | Branch for data storage | `main` (default) |

#### Step 3: Deploy
```bash
git add .
git commit -m "Deploy Discord Giveaway Bot"
git push heroku main
```

#### Step 4: Verify
Check your logs: `heroku logs --tail`
You should see: `Ready! Logged in as YourBot#1234`

## 💻 Local Development Setup

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd discord-giveaway-bot
   npm install
   ```

2. **Configure Environment**
   Create `.env` file:
   ```env
   DISCORD_TOKEN=your-bot-token
   DISCORD_CLIENT_ID=your-bot-client-id
   DISCORD_GUILD_ID=your-server-id
   COMMAND_PREFIX=!
   ```

3. **Deploy Commands & Start**
   ```bash
   npm run deploy-commands
   npm start
   ```

## Usage

### Slash commands

| Command | Purpose |
| --- | --- |
| `/giveaway create channel:<#channel> duration:<1h> prize:"Nitro" [required_role:@Role]` | Start a new giveaway in the selected channel. |
| `/giveaway entries identifier:<giveawayId or message URL>` | DM a private list of entrants (20 per message). |
| `/giveaway cancel identifier:<id> [reason:"Disqualified"]` | Cancel an active giveaway and notify the channel. |
| `/giveaway reroll identifier:<id>` | Draw an additional winner from an ended giveaway (excludes previous winners). |
| `/giveaway list [status:<active\|ended\|cancelled>]` | Show a filtered overview of active, ended, or cancelled giveaways. |
| `/stats overview` | View today's server statistics snapshot (members, joins, leaves, messages, voice). |
| `/stats daily` | Detailed breakdown of daily activity with progress bars. |
| `/stats weekly` | 7-day summary with trends and charts. |
| `/stats members` | Member growth and retention analytics. |
| `/stats activity` | Server engagement metrics (messages, voice, roles, online peaks). |
| `/mod warn user:<@user> [reason:"Spam"]` | Issue a warning to a member. |
| `/mod kick user:<@user> [reason:"Breaking rules"]` | Kick a member from the server. |
| `/mod ban user:<@user> [reason:"Severe violation"] [delete_days:<7>]` | Ban a member and optionally delete recent messages. |
| `/mod timeout user:<@user> duration:<10m> [reason:"Cooldown"]` | Timeout a member for a specified duration. |
| `/mod untimeout user:<@user>` | Remove timeout from a member. |
| `/mod purge amount:<100> [user:@user]` | Delete multiple messages (optionally filtered by user). |
| `/prefix show` | Display the current guild prefix. |
| `/prefix set value:<?>` | Update the prefix (max five characters, per guild). |
| `/ping` | Check bot latency and status. |
| `/help` | Interactive paginated help menu with all commands. |

All slash commands reply ephemerally and are restricted to members with appropriate permissions (**Manage Server** for giveaways/stats, **Moderate Members** for moderation).

### Prefix commands (default `!`)

| Command | Purpose |
| --- | --- |
| ``!giveaway create #channel <duration> <prize> [@role]`` | Start a giveaway. |
| ``!giveaway entries <giveawayId|messageLink>`` | Post entrant list in the current channel. |
| ``!giveaway cancel <giveawayId|messageLink> [reason]`` | Cancel an active giveaway. |
| ``!giveaway reroll <giveawayId|messageLink>`` | Draw an additional winner. |
| ``!giveaway list [active|ended|cancelled]`` | List giveaways (omit the argument to show all). |
| ``!stats overview`` | View today's server statistics. |
| ``!stats daily`` | Detailed daily activity breakdown. |
| ``!stats weekly`` | 7-day summary with trends. |
| ``!stats members`` | Member growth analytics. |
| ``!stats activity`` | Server engagement metrics. |
| ``!prefix show`` | Display the active prefix. |
| ``!prefix set <newPrefix>`` | Change the prefix (persists to disk). |
| ``!ping`` | Check bot latency. |
| ``!help`` | Show all admin commands with examples. |

**Note:** Moderation commands are only available via slash commands (`/mod`).

### Entrant experience

Participants click the **Enter Giveaway** button. The bot checks the configured role requirement (if any) and acknowledges their entry privately. When the timer ends, the button is disabled, a winner is announced, and the result is posted in the channel. If no one qualifies, the bot reports that no winner could be determined. Admins can cancel an active giveaway at any time or reroll additional winners after it ends.

## Data storage

All data is automatically persisted to GitHub for reliability on Heroku's ephemeral filesystem:

- **`giveaways.json`**: Active, ended, and cancelled giveaway metadata
- **`statistics.json`**: Server statistics (30-day retention with daily tracking)
- **`settings.json`**: Per-guild settings (command prefix)

Data is automatically backed up to your GitHub repository specified in `GITHUB_REPO` environment variable. This ensures zero data loss even when Heroku restarts your dyno.

### Automatic Cleanup
- Giveaways: 7+ days after ending are automatically removed
- Statistics: 30+ days of historical data are automatically purged
- Data syncs to GitHub every time changes are made

## Extending

- Support additional requirements (e.g., minimum account age) by extending `GiveawayManager.handleButtonInteraction`.
- Add multi-winner support or weighted entries by enhancing `GiveawayManager`'s winner selection logic.
- Wire up reminders or scheduled announcements by tracking intermediate timers alongside the main giveaway end time.

## Troubleshooting

- **`Missing Access` when posting**: Ensure the bot role can view and send messages in the chosen channel.
- **Prefix commands not triggering**: Confirm the Message Content intent is enabled in the Developer Portal and the bot was restarted afterward.
- **Slash command missing**: Re-run `npm run deploy-commands` after updating command code or changing guild ID.

## License

MIT
