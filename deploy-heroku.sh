#!/bin/bash

# Discord Giveaway Bot - Heroku Deployment Script
# Run this script to deploy your bot to Heroku

echo "🚀 Discord Giveaway Bot - Heroku Deployment"
echo "============================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    heroku login
fi

# Get app name
read -p "📝 Enter your Heroku app name: " APP_NAME

# Create Heroku app
echo "🏗️  Creating Heroku app '$APP_NAME'..."
heroku create $APP_NAME

if [ $? -ne 0 ]; then
    echo "❌ Failed to create app. It might already exist."
    read -p "🤔 Use existing app '$APP_NAME'? (y/n): " USE_EXISTING
    if [ "$USE_EXISTING" != "y" ]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

# Get Discord credentials
echo ""
echo "🎮 Discord Bot Configuration"
echo "Get these from: https://discord.com/developers/applications"
echo ""

read -p "🔑 Discord Bot Token: " DISCORD_TOKEN
read -p "🆔 Discord Client ID: " DISCORD_CLIENT_ID
read -p "🏠 Discord Guild ID (optional, press enter to skip): " DISCORD_GUILD_ID
read -p "⚡ Command Prefix (default: !): " COMMAND_PREFIX

# Set default prefix if empty
if [ -z "$COMMAND_PREFIX" ]; then
    COMMAND_PREFIX="!"
fi

# Set environment variables
echo "⚙️  Setting environment variables..."
heroku config:set DISCORD_TOKEN="$DISCORD_TOKEN" --app $APP_NAME
heroku config:set DISCORD_CLIENT_ID="$DISCORD_CLIENT_ID" --app $APP_NAME
heroku config:set COMMAND_PREFIX="$COMMAND_PREFIX" --app $APP_NAME

if [ ! -z "$DISCORD_GUILD_ID" ]; then
    heroku config:set DISCORD_GUILD_ID="$DISCORD_GUILD_ID" --app $APP_NAME
fi

# Deploy to Heroku
echo "📦 Deploying to Heroku..."
git add .
git commit -m "Deploy Discord Giveaway Bot to Heroku"
git push heroku main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🔗 Your app: https://$APP_NAME.herokuapp.com"
    echo "📊 View logs: heroku logs --tail --app $APP_NAME"
    echo ""
    echo "🎉 Your Discord Giveaway Bot is now live!"
    echo "📋 Don't forget to:"
    echo "   1. Invite the bot to your Discord server"
    echo "   2. Give it proper permissions (Manage Messages, Add Reactions, etc.)"
    echo "   3. Test with: !help or /giveaway create"
else
    echo "❌ Deployment failed. Check the output above for errors."
    exit 1
fi