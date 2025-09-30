@echo off
echo.
echo 🚀 Discord Giveaway Bot - Heroku Deployment
echo =============================================
echo.

REM Check if Heroku CLI is installed
heroku --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Heroku CLI not found. Please install it first:
    echo    https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Check if user is logged in to Heroku
heroku auth:whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Please login to Heroku first:
    heroku login
)

REM Get app name
set /p APP_NAME="📝 Enter your Heroku app name: "

REM Create Heroku app
echo 🏗️  Creating Heroku app '%APP_NAME%'...
heroku create %APP_NAME%

if %errorlevel% neq 0 (
    echo ❌ Failed to create app. It might already exist.
    set /p USE_EXISTING="🤔 Use existing app '%APP_NAME%'? (y/n): "
    if not "%USE_EXISTING%"=="y" (
        echo ❌ Deployment cancelled.
        pause
        exit /b 1
    )
)

REM Get Discord credentials
echo.
echo 🎮 Discord Bot Configuration
echo Get these from: https://discord.com/developers/applications
echo.

set /p DISCORD_TOKEN="🔑 Discord Bot Token: "
set /p DISCORD_CLIENT_ID="🆔 Discord Client ID: "
set /p DISCORD_GUILD_ID="🏠 Discord Guild ID (optional, press enter to skip): "
set /p COMMAND_PREFIX="⚡ Command Prefix (default: !): "

REM Set default prefix if empty
if "%COMMAND_PREFIX%"=="" set COMMAND_PREFIX=!

REM Set environment variables
echo ⚙️  Setting environment variables...
heroku config:set DISCORD_TOKEN="%DISCORD_TOKEN%" --app %APP_NAME%
heroku config:set DISCORD_CLIENT_ID="%DISCORD_CLIENT_ID%" --app %APP_NAME%
heroku config:set COMMAND_PREFIX="%COMMAND_PREFIX%" --app %APP_NAME%

if not "%DISCORD_GUILD_ID%"=="" (
    heroku config:set DISCORD_GUILD_ID="%DISCORD_GUILD_ID%" --app %APP_NAME%
)

REM Deploy to Heroku
echo 📦 Deploying to Heroku...
git add .
git commit -m "Deploy Discord Giveaway Bot to Heroku"
git push heroku main

if %errorlevel% equ 0 (
    echo.
    echo ✅ Deployment successful!
    echo 🔗 Your app: https://%APP_NAME%.herokuapp.com
    echo 📊 View logs: heroku logs --tail --app %APP_NAME%
    echo.
    echo 🎉 Your Discord Giveaway Bot is now live!
    echo 📋 Don't forget to:
    echo    1. Invite the bot to your Discord server
    echo    2. Give it proper permissions (Manage Messages, Add Reactions, etc.^)
    echo    3. Test with: !help or /giveaway create
) else (
    echo ❌ Deployment failed. Check the output above for errors.
)

echo.
pause