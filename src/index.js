require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const GiveawayManager = require('./giveaways/GiveawayManager');
const SettingsManager = require('./utils/settings');
const GitHubStorage = require('./utils/githubStorage');
const StatisticsManager = require('./utils/statistics');

const defaultPrefix = process.env.COMMAND_PREFIX || '!';
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ Missing DISCORD_TOKEN in environment variables.');
  console.error('🔧 Make sure to set DISCORD_TOKEN in Heroku Config Vars');
  process.exit(1);
}

console.log('🚀 Starting Aura Giveaway Bot...');
console.log(`📍 Platform: ${process.platform}`);
console.log(`📍 Node Version: ${process.version}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`� Process ID: ${process.pid}`);
console.log('�📋 Environment check:');
console.log(`   - DISCORD_TOKEN: ${token ? '✅ Set (' + token.substring(0, 20) + '...)' : '❌ Missing'}`);
console.log(`   - DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID || '❌ Missing'}`);
console.log(`   - DISCORD_GUILD_ID: ${process.env.DISCORD_GUILD_ID || '❌ Missing'}`);
console.log(`   - COMMAND_PREFIX: ${process.env.COMMAND_PREFIX || '!'}`);
console.log('🔗 Connecting to Discord...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

// Initialize GitHub storage
const githubStorage = new GitHubStorage();

// Initialize managers
const giveawayManager = new GiveawayManager(githubStorage);
const settingsManager = new SettingsManager(defaultPrefix);
const statsManager = new StatisticsManager(githubStorage);

function loadPrefixCommands() {
  const commandsPath = path.join(__dirname, 'commands', 'prefix');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.name) {
      client.prefixCommands.set(command.name, command);
    }
  }
}

function loadSlashCommands() {
  const commandsPath = path.join(__dirname, 'commands', 'slash');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.data?.name) {
      client.slashCommands.set(command.data.name, command);
    }
  }
}

loadPrefixCommands();
loadSlashCommands();

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
  console.log(`🤖 Bot ID: ${readyClient.user.id}`);
  console.log(`🏠 Serving ${readyClient.guilds.cache.size} guilds`);
  console.log(`🌐 Gateway: ${readyClient.ws.gateway}`);
  console.log(`📊 Latency: ${readyClient.ws.ping}ms`);
  console.log(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  // List all guilds for debugging
  console.log('📚 Guild list:');
  readyClient.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (ID: ${guild.id})`);
  });
  
  // Initialize GitHub storage
  console.log('🔄 Initializing GitHub storage...');
  await githubStorage.init();
  
  // Load giveaways from GitHub if enabled
  if (githubStorage.enabled) {
    const data = await githubStorage.loadFromGitHub();
    if (data && data.length > 0) {
      console.log(`📥 Loaded ${data.length} giveaway(s) from GitHub`);
    }
  }
  
  giveawayManager.init(readyClient);
  console.log('🎉 Giveaway Manager initialized successfully!');
  
  // Initialize statistics manager
  statsManager.init(readyClient);
  console.log('📊 Statistics Manager initialized successfully!');
  
  // Run initial cleanup of old giveaways
  console.log('🧹 Running initial giveaway cleanup...');
  giveawayManager.cleanupOldGiveaways();
  
  // Schedule daily cleanup (every 24 hours)
  setInterval(() => {
    console.log('🧹 Running scheduled giveaway cleanup...');
    giveawayManager.cleanupOldGiveaways();
  }, 24 * 60 * 60 * 1000); // 24 hours
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) {
    return;
  }

  // Track message statistics
  statsManager.recordMessage(message.guildId);

  const guildPrefix = settingsManager.getPrefix(message.guildId);

  if (!message.content.startsWith(guildPrefix)) {
    return;
  }

  const args = message.content.slice(guildPrefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) {
    return;
  }

  const command = client.prefixCommands.get(commandName);
  if (!command) {
    return;
  }

  try {
    await command.execute(message, args, {
      client,
      manager: giveawayManager,
      prefix: guildPrefix,
      settings: settingsManager,
      statsManager: statsManager
    });
  } catch (error) {
    console.error('Error executing prefix command:', error);
    await message.reply('There was an error executing that command.');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: 'Command not found.', ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction, {
        client,
        manager: giveawayManager,
        settings: settingsManager,
        prefix: settingsManager.getPrefix(interaction.guildId),
        statsManager: statsManager
      });
    } catch (error) {
      console.error('Error executing slash command:', error);
      const response = { content: 'There was an error executing that command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  } else if (interaction.isButton()) {
    await giveawayManager.handleButtonInteraction(interaction);
  }
});

// Handle reaction add events for giveaway participation
client.on('messageReactionAdd', async (reaction, user) => {
  // Handle partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the reaction:', error);
      return;
    }
  }

  await giveawayManager.handleReactionAdd(reaction, user);
});

// Handle reaction remove events for giveaway participation
client.on('messageReactionRemove', async (reaction, user) => {
  // Handle partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the reaction:', error);
      return;
    }
  }

  await giveawayManager.handleReactionRemove(reaction, user);
});

// Add additional event handlers for debugging
client.on('error', error => {
  console.error('❌ Discord Client Error:', error);
});

client.on('warn', warning => {
  console.warn('⚠️ Discord Client Warning:', warning);
});

client.on('disconnect', () => {
  console.log('🔌 Disconnected from Discord');
});

client.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Discord...');
});

// Member join tracking
client.on(Events.GuildMemberAdd, async (member) => {
  statsManager.recordMemberJoin(member.guild.id);
  console.log(`📥 Member joined: ${member.user.tag} in ${member.guild.name}`);
});

// Member leave tracking
client.on(Events.GuildMemberRemove, async (member) => {
  statsManager.recordMemberLeave(member.guild.id);
  console.log(`📤 Member left: ${member.user.tag} from ${member.guild.name}`);
});

// Voice state tracking (join/leave/switch channels)
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guildId = newState.guild.id;
  const userId = newState.member.id;

  // User joined a voice channel
  if (!oldState.channel && newState.channel) {
    statsManager.recordVoiceJoin(userId, guildId, newState.channel.id);
    console.log(`🎤 ${newState.member.user.tag} joined voice channel in ${newState.guild.name}`);
  }
  
  // User left a voice channel
  if (oldState.channel && !newState.channel) {
    statsManager.recordVoiceLeave(userId);
    console.log(`🔇 ${newState.member.user.tag} left voice channel in ${newState.guild.name}`);
  }
});

// Role update tracking
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  // Check if roles changed
  if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
    statsManager.recordRoleChange(newMember.guild.id);
    console.log(`🎭 Role changed for ${newMember.user.tag} in ${newMember.guild.name}`);
  }
});

// Track max online count every 5 minutes
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    statsManager.updateMaxOnline(guild.id, onlineCount);
  });
}, 5 * 60 * 1000); // Every 5 minutes

// Enhanced login with better error handling
console.log('🔑 Attempting to login...');
client.login(token).catch(error => {
  console.error('❌ Failed to login to Discord:');
  console.error('Error details:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('🔧 Possible solutions:');
  console.error('   1. Check if DISCORD_TOKEN is correct');
  console.error('   2. Regenerate token in Discord Developer Portal');  
  console.error('   3. Make sure bot is not already running elsewhere');
  console.error('   4. Check if Discord is having outages');
  process.exit(1);
});

// Keep alive signal for Heroku
setInterval(() => {
  console.log(`💓 Heartbeat - Bot is alive! Guilds: ${client.guilds?.cache.size || 0}`);
}, 300000); // Every 5 minutes
