# 🗄️ MongoDB Atlas Setup Guide

This guide will walk you through setting up MongoDB Atlas for the Aura Giveaway Bot. MongoDB Atlas provides **free cloud database hosting** with 512MB storage on their free tier.

---

## 📋 Table of Contents

1. [Create MongoDB Atlas Account](#step-1-create-mongodb-atlas-account)
2. [Create a Database Cluster](#step-2-create-a-database-cluster)
3. [Create Database User](#step-3-create-database-user)
4. [Whitelist IP Addresses](#step-4-whitelist-ip-addresses)
5. [Get Connection String](#step-5-get-connection-string)
6. [Add to Heroku](#step-6-add-to-heroku)
7. [Verify Setup](#step-7-verify-setup)
8. [Troubleshooting](#troubleshooting)

---

## Step 1: Create MongoDB Atlas Account

1. Go to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)**
2. Click **"Try Free"** or **"Sign Up"**
3. Sign up using one of these methods:
   - Google account (recommended - fastest)
   - GitHub account
   - Email and password
4. Complete the registration form
5. Verify your email if required

---

## Step 2: Create a Database Cluster

1. After logging in, you'll see the **"Create a deployment"** page
2. Choose deployment type:
   - Click **"M0 FREE"** (512MB storage, perfect for Discord bots)
3. Select cloud provider:
   - **AWS** (recommended)
   - Google Cloud Platform
   - Azure
4. Select region:
   - Choose the closest region to your Heroku app
   - For US-based Heroku apps: **US East (N. Virginia)** `us-east-1`
   - For EU-based apps: **EU (Ireland)** `eu-west-1`
5. Cluster name:
   - Keep default name `Cluster0` or rename to `AuraBot`
6. Click **"Create Deployment"**

⏳ **Cluster creation takes 3-10 minutes**

---

## Step 3: Create Database User

While the cluster is being created:

1. Click **"Database Access"** in the left sidebar (under Security)
2. Click **"+ ADD NEW DATABASE USER"**
3. Choose authentication method:
   - Select **"Password"** (default)
4. Enter user credentials:
   - **Username**: `aura-bot` (or any name you prefer)
   - **Password**: Click **"Autogenerate Secure Password"** or create your own
     - ⚠️ **IMPORTANT**: Save this password somewhere safe!
5. Database User Privileges:
   - Select **"Read and write to any database"**
6. Temporary User (optional):
   - Leave unchecked (bot needs permanent access)
7. Click **"Add User"**

**✅ Your credentials:**
```
Username: aura-bot
Password: [YOUR_GENERATED_PASSWORD]
```
**Keep these safe - you'll need them shortly!**

---

## Step 4: Whitelist IP Addresses

MongoDB Atlas requires you to whitelist IP addresses that can connect:

1. Click **"Network Access"** in the left sidebar (under Security)
2. Click **"+ ADD IP ADDRESS"**
3. Choose one of these options:

   **Option A: Allow from Anywhere (Recommended for Heroku)**
   - Click **"ALLOW ACCESS FROM ANYWHERE"**
   - This adds `0.0.0.0/0` (all IPs)
   - ✅ Safe for free tier with strong password
   - ✅ Works with Heroku's rotating IPs

   **Option B: Add Specific IPs (For local testing)**
   - Click **"ADD CURRENT IP ADDRESS"** for your computer
   - Heroku requires Option A due to dynamic IPs

4. Add a comment: `Heroku Bot` or `All Access`
5. Click **"Confirm"**

---

## Step 5: Get Connection String

1. Go back to **"Database"** (click "Database" in left sidebar)
2. Wait for cluster status to show **"Active"** (green checkmark)
3. Click **"Connect"** button next to your cluster
4. Choose connection method:
   - Click **"Drivers"**
5. Select your driver:
   - **Driver**: `Node.js`
   - **Version**: `5.5 or later` (default)
6. Copy the connection string:

```
mongodb+srv://aura-bot:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

7. **IMPORTANT**: Replace `<password>` with your actual password from Step 3
   - ❌ Wrong: `mongodb+srv://aura-bot:<password>@...`
   - ✅ Correct: `mongodb+srv://aura-bot:YourActualPassword123@...`

8. Add database name (optional but recommended):
   - Add `/aura-bot` before the `?`:
   - ✅ `mongodb+srv://aura-bot:password@cluster0.xxxxx.mongodb.net/aura-bot?retryWrites=true&w=majority`

**Your final connection string should look like:**
```
mongodb+srv://aura-bot:YOUR_PASSWORD_HERE@cluster0.abcde.mongodb.net/aura-bot?retryWrites=true&w=majority
```

---

## Step 6: Add to Heroku

Now add your MongoDB connection string to Heroku:

### Option A: Using Heroku Dashboard (Easy)

1. Go to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Click on your app: **aura-utility**
3. Go to **"Settings"** tab
4. Click **"Reveal Config Vars"**
5. Add new config var:
   - **KEY**: `MONGODB_URI`
   - **VALUE**: Your full connection string from Step 5
6. Click **"Add"**

### Option B: Using Heroku CLI (Fast)

Open PowerShell and run:

```powershell
heroku config:set MONGODB_URI="mongodb+srv://aura-bot:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/aura-bot?retryWrites=true&w=majority" --app aura-utility
```

**Replace with your actual connection string!**

---

## Step 7: Verify Setup

After adding the config var:

### 1. Check Config Vars

```powershell
heroku config --app aura-utility
```

You should see:
```
=== aura-utility Config Vars
DISCORD_TOKEN:  OTY3NTI...
MONGODB_URI:    mongodb+srv://aura-bot:...
```

### 2. Restart Heroku Dyno

```powershell
heroku restart --app aura-utility
```

### 3. Check Logs for MongoDB Connection

```powershell
heroku logs --tail --app aura-utility
```

Look for these success messages:
```
🔄 Connecting to MongoDB Atlas...
✅ Successfully connected to MongoDB Atlas!
📊 Database: aura-bot
```

✅ **If you see those messages, MongoDB is working!**

### 4. Test the Bot

In your Discord server:
```
/stats overview
```

You should see statistics being tracked!

---

## 🎉 Setup Complete!

Your bot is now using MongoDB Atlas for data storage. Benefits:

✅ **No more 403 GitHub errors**  
✅ **Data persists across Heroku restarts**  
✅ **Fast queries and statistics**  
✅ **Scalable to thousands of giveaways**  
✅ **Free forever (512MB tier)**  

---

## 🛠️ Troubleshooting

### Issue 1: "Failed to connect to MongoDB"

**Check:**
1. MONGODB_URI is set in Heroku config vars
2. Password has no special characters that need escaping
3. IP whitelist includes `0.0.0.0/0`
4. Cluster is "Active" (not paused)

**Fix:**
```powershell
# Check config
heroku config --app aura-utility

# If MONGODB_URI is missing, add it
heroku config:set MONGODB_URI="your-connection-string" --app aura-utility
```

---

### Issue 2: "Authentication failed"

**Cause:** Wrong password in connection string

**Fix:**
1. Go to MongoDB Atlas → Database Access
2. Click "Edit" on your user
3. Click "Edit Password" → Auto-generate new password
4. Copy new password
5. Update Heroku config:
```powershell
heroku config:set MONGODB_URI="mongodb+srv://aura-bot:NEW_PASSWORD@cluster0.xxxxx.mongodb.net/aura-bot?retryWrites=true&w=majority" --app aura-utility
```

---

### Issue 3: "MongooseError: Operation buffering timed out"

**Cause:** IP not whitelisted or network issue

**Fix:**
1. Go to MongoDB Atlas → Network Access
2. Remove existing IP entries
3. Add new IP: `0.0.0.0/0` (Allow from Anywhere)
4. Wait 2 minutes for changes to apply
5. Restart Heroku dyno:
```powershell
heroku restart --app aura-utility
```

---

### Issue 4: Connection string has special characters

**Problem:** Password contains `@`, `:`, `/`, `?` or other special characters

**Fix:** URL-encode the password
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`

**Example:**
- Original password: `My@Pass:123`
- Encoded password: `My%40Pass%3A123`
- Connection string: `mongodb+srv://aura-bot:My%40Pass%3A123@cluster0...`

---

### Issue 5: "Database not found"

**Not actually an error!** MongoDB auto-creates databases on first write.

**Verify:**
1. Send a message in Discord (triggers stats recording)
2. Check MongoDB Atlas → Database → Browse Collections
3. You should see `aura-bot` database with `giveaways` and `statistics` collections

---

## 📊 Monitoring Your Database

### View Data in MongoDB Atlas

1. Go to **"Database"** in left sidebar
2. Click **"Browse Collections"** on your cluster
3. You'll see:
   - **giveaways** collection (stores all giveaways)
   - **statistics** collection (stores server stats)

### Check Database Size

1. Go to **"Database"** → **"Charts"** tab
2. View:
   - Storage size
   - Document count
   - Operations per second

**Free tier limit: 512MB** (enough for ~10,000+ giveaways)

---

## 🔧 Advanced Configuration

### Custom Database Name

Default: `aura-bot`

To change:
```powershell
heroku config:set MONGODB_URI="mongodb+srv://...mongodb.net/custom-name?retryWrites=true&w=majority" --app aura-utility
```

### Connection Pool Options

For high-traffic bots, optimize connection pooling:

```
mongodb+srv://...mongodb.net/aura-bot?retryWrites=true&w=majority&maxPoolSize=10&minPoolSize=2
```

---

## 📖 Additional Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/guide.html
- **Connection String Guide**: https://www.mongodb.com/docs/manual/reference/connection-string/
- **Free Tier Limits**: https://www.mongodb.com/pricing

---

## ✅ Next Steps

After MongoDB setup:

1. ✅ **Test giveaway creation**: `/giveaway start`
2. ✅ **Check statistics**: `/stats overview`
3. ✅ **Verify data persistence**: Restart bot, data should remain
4. ✅ **Monitor logs**: `heroku logs --tail --app aura-utility`

---

## 💡 Tips

1. **Backup**: MongoDB Atlas auto-backs up free tier clusters (1-day retention)
2. **Security**: Never share your connection string publicly
3. **Monitoring**: Check Atlas dashboard weekly for usage stats
4. **Scaling**: Can upgrade to M2 ($9/mo) for more storage if needed
5. **Multiple Bots**: Can use same cluster with different database names

---

**🎊 Congratulations! Your bot now has professional database storage!**

Need help? Check Heroku logs or MongoDB Atlas monitoring dashboard.
