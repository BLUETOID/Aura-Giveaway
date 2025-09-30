require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID; // Support both names
const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID; // Support both names

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in the environment.');
  process.exit(1);
}

// If no guild ID is provided, deploy globally (takes up to 1 hour)
if (!guildId) {
  console.log('No DISCORD_GUILD_ID provided. Deploying commands globally (may take up to 1 hour)...');
}

const commandsDir = path.join(__dirname, '../src/commands/slash');
const commandFiles = fs.readdirSync(commandsDir).filter((file) => file.endsWith('.js'));
const commands = commandFiles.map((file) => {
  const command = require(path.join(commandsDir, file));
  return command.data.toJSON();
});

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      // Deploy to specific guild (faster for testing)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`Successfully reloaded application (/) commands for guild ${guildId}.`);
    } else {
      // Deploy globally (takes up to 1 hour but works everywhere)
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Successfully reloaded global application (/) commands.');
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    // Don't exit on command deployment failure, let the bot start anyway
    console.log('Bot will continue starting despite command deployment failure...');
  }
})();
