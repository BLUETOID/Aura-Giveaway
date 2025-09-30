require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in the environment.');
  process.exit(1);
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

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
