const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { formatDuration } = require('../utils/duration');

const STORAGE_PATH = path.join(__dirname, '../../data/giveaways.json');
const BUTTON_CUSTOM_ID_PREFIX = 'giveaway-enter-';
const GIVEAWAY_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
};

class GiveawayManager {
  constructor() {
    this.client = null;
    this.giveaways = new Map();
    this.timers = new Map();
    this.ensureStorage();
    this.loadGiveaways();
  }

  init(client) {
    this.client = client;
    for (const giveaway of this.giveaways.values()) {
      if (giveaway.status === GIVEAWAY_STATUS.ACTIVE) {
        this.scheduleGiveaway(giveaway);
      }
    }
  }

  ensureStorage() {
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.writeFileSync(STORAGE_PATH, '[]', 'utf8');
    }
  }

  normalizeGiveaway(raw) {
    if (!raw) {
      return null;
    }

    const normalized = {
      id: raw.id || randomUUID(),
      guildId: raw.guildId,
      channelId: raw.channelId,
      messageId: raw.messageId,
      prize: raw.prize,
      hostId: raw.hostId,
      createdAt: raw.createdAt || Date.now(),
      endsAt: raw.endsAt,
      requirements: raw.requirements || {},
      participants: Array.isArray(raw.participants) ? raw.participants : [],
      winnerIds: Array.isArray(raw.winnerIds) ? raw.winnerIds : [],
      winnerCount: raw.winnerCount || 1,
      status: Object.values(GIVEAWAY_STATUS).includes(raw.status) ? raw.status : GIVEAWAY_STATUS.ACTIVE,
      endedAt: raw.endedAt || null,
      endedBy: raw.endedBy || null,
      cancelReason: raw.cancelReason || null,
      cancelledAt: raw.cancelledAt || null,
      cancelledBy: raw.cancelledBy || null,
      lastRerolledAt: raw.lastRerolledAt || null,
      lastRerolledBy: raw.lastRerolledBy || null
    };

    if (!normalized.endsAt) {
      normalized.endsAt = Date.now() + 60_000;
    }

    return normalized;
  }

  loadGiveaways() {
    try {
      const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const giveaway = this.normalizeGiveaway(item);
          if (giveaway) {
            this.giveaways.set(giveaway.id, giveaway);
          }
        }
      }
    } catch (error) {
      console.error('[GiveawayManager] Failed to load giveaways:', error);
    }
  }

  saveGiveaways() {
    try {
      const serialized = JSON.stringify([...this.giveaways.values()], null, 2);
      fs.writeFileSync(STORAGE_PATH, serialized, 'utf8');
    } catch (error) {
      console.error('[GiveawayManager] Failed to save giveaways:', error);
    }
  }

  getGiveaway(giveawayId) {
    return this.giveaways.get(giveawayId) || null;
  }

  resolveGiveaway(identifier) {
    if (!identifier) {
      return null;
    }

    if (this.giveaways.has(identifier)) {
      return this.giveaways.get(identifier);
    }

    const sanitized = identifier.replace(/[^0-9a-zA-Z-]/g, '');
    if (sanitized && this.giveaways.has(sanitized)) {
      return this.giveaways.get(sanitized);
    }

    const match = identifier.match(/\d{17,}/g);
    const messageId = match ? match.pop() : null;
    if (messageId) {
      return this.findGiveawayByMessageId(messageId);
    }

    return null;
  }

  findGiveawayByMessageId(messageId) {
    for (const giveaway of this.giveaways.values()) {
      if (giveaway.messageId === messageId) {
        return giveaway;
      }
    }
    return null;
  }

  getActiveGiveaways() {
    return [...this.giveaways.values()].filter((giveaway) => giveaway.status === GIVEAWAY_STATUS.ACTIVE);
  }

  getAllGiveaways() {
    return [...this.giveaways.values()];
  }

  async createGiveaway({ guildId, channelId, prize, durationMs, hostId, requirements = {}, winnerCount = 1 }) {
    if (!this.client) {
      throw new Error('GiveawayManager is not initialized yet.');
    }

    const guild = await this.client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Selected channel is not text-based.');
    }

    const endsAt = Date.now() + durationMs;
    const giveawayId = randomUUID();
    const customId = `${BUTTON_CUSTOM_ID_PREFIX}${giveawayId}`;

    const winnerText = winnerCount === 1 ? '1 Winner' : `${winnerCount} Winners`;
    
    const embed = new EmbedBuilder()
      .setTitle(prize)
      .setDescription('React with 🎉 below to enter the giveaway!')
      .addFields(
        { name: 'Hosted by', value: `<@${hostId}>`, inline: true },
        { name: 'Winners', value: winnerText, inline: true },
        { name: 'Ends in', value: formatDuration(durationMs), inline: true }
      )
      .setFooter({ text: `Giveaway ID: ${giveawayId} • 0 entries` })
      .setTimestamp(new Date(endsAt))
      .setColor(0x5865f2);

    if (requirements.roleId) {
      embed.addFields({
        name: 'Requirements',
        value: `Must have <@&${requirements.roleId}>`
      });
    }

    // Admin buttons for managing entries
    const checkEntriesButton = new ButtonBuilder()
      .setCustomId(`check_entries_${giveawayId}`)
      .setLabel('Check Entries')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋');

    const removeEntryButton = new ButtonBuilder()
      .setCustomId(`remove_entry_${giveawayId}`)
      .setLabel('Remove Entry')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(checkEntriesButton, removeEntryButton);

    const message = await channel.send({ embeds: [embed], components: [row] });

    // Add initial tada emoji to the giveaway message
    try {
      await message.react('🎉');
    } catch (error) {
      console.log('Could not add initial reaction:', error.message);
    }

    const giveaway = {
      id: giveawayId,
      guildId,
      channelId,
      messageId: message.id,
      prize,
      hostId,
      createdAt: Date.now(),
      endsAt,
      requirements,
      participants: [],
      winnerIds: [],
      winnerCount,
      status: GIVEAWAY_STATUS.ACTIVE,
      endedAt: null,
      endedBy: null,
      cancelReason: null,
      cancelledAt: null,
      cancelledBy: null,
      lastRerolledAt: null,
      lastRerolledBy: null
    };

    this.giveaways.set(giveawayId, giveaway);
    this.saveGiveaways();
    this.scheduleGiveaway(giveaway);

    return giveaway;
  }

  async handleReactionAdd(reaction, user) {
    if (user.bot || reaction.emoji.name !== '🎉') {
      return;
    }

    const message = reaction.message;
    const giveaway = Array.from(this.giveaways.values()).find(g => g.messageId === message.id);
    
    if (!giveaway || giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      return;
    }

    if (Date.now() >= giveaway.endsAt) {
      return;
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return;
    }

    // Check role requirements
    if (giveaway.requirements?.roleId && !member.roles.cache.has(giveaway.requirements.roleId)) {
      // Remove the reaction if user doesn't meet requirements
      try {
        await reaction.users.remove(user.id);
      } catch (error) {
        console.log('Could not remove reaction:', error.message);
      }
      return;
    }

    // Add user to participants if not already there
    if (!giveaway.participants.includes(user.id)) {
      giveaway.participants.push(user.id);
      this.saveGiveaways();

      // Update embed footer with entry count
      try {
        const embed = message.embeds[0];
        if (embed) {
          const tadaCount = '🎉'.repeat(Math.min(giveaway.participants.length, 10));
          const updatedEmbed = new EmbedBuilder(embed.data)
            .setFooter({ text: `Giveaway ID: ${giveaway.id} • ${giveaway.participants.length} entries ${tadaCount}` });
          
          await message.edit({ embeds: [updatedEmbed], components: message.components });
        }
      } catch (error) {
        console.log('Could not update embed:', error.message);
      }
    }
  }

  async handleReactionRemove(reaction, user) {
    if (user.bot || reaction.emoji.name !== '🎉') {
      return;
    }

    const message = reaction.message;
    const giveaway = Array.from(this.giveaways.values()).find(g => g.messageId === message.id);
    
    if (!giveaway || giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      return;
    }

    // Remove user from participants
    const index = giveaway.participants.indexOf(user.id);
    if (index > -1) {
      giveaway.participants.splice(index, 1);
      this.saveGiveaways();

      // Update embed footer with entry count
      try {
        const embed = message.embeds[0];
        if (embed) {
          const tadaCount = '🎉'.repeat(Math.min(giveaway.participants.length, 10));
          const updatedEmbed = new EmbedBuilder(embed.data)
            .setFooter({ text: `Giveaway ID: ${giveaway.id} • ${giveaway.participants.length} entries ${tadaCount}` });
          
          await message.edit({ embeds: [updatedEmbed], components: message.components });
        }
      } catch (error) {
        console.log('Could not update embed:', error.message);
      }
    }
  }

  async handleButtonInteraction(interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const { customId, user, member } = interaction;
    
    // Handle admin buttons
    if (customId.startsWith('check_entries_')) {
      await this.handleCheckEntries(interaction);
      return;
    }
    
    if (customId.startsWith('remove_entry_')) {
      await this.handleRemoveEntry(interaction);
      return;
    }

    // Legacy button handling (for old giveaways)
    if (!customId.startsWith(BUTTON_CUSTOM_ID_PREFIX)) {
      return;
    }

    const giveawayId = customId.replace(BUTTON_CUSTOM_ID_PREFIX, '');
    const giveaway = this.giveaways.get(giveawayId);
    if (!giveaway) {
      await interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
      return;
    }

    if (giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      await interaction.reply({ content: 'This giveaway is no longer accepting entries.', ephemeral: true });
      return;
    }

    if (Date.now() >= giveaway.endsAt) {
      await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
      return;
    }

    if (!member || !member.roles) {
      await interaction.reply({ content: 'Unable to verify your eligibility right now.', ephemeral: true });
      return;
    }

    if (giveaway.requirements?.roleId && !member.roles.cache.has(giveaway.requirements.roleId)) {
      await interaction.reply({ content: 'You do not meet the role requirement for this giveaway.', ephemeral: true });
      return;
    }

    if (giveaway.participants.includes(user.id)) {
      await interaction.reply({ content: 'You are already entered in this giveaway!', ephemeral: true });
      return;
    }

    giveaway.participants.push(user.id);
    this.saveGiveaways();

    // Update the embed footer with entry count (visual feedback)
    try {
      const embed = interaction.message.embeds[0];
      if (embed) {
        const tadaCount = '🎉'.repeat(Math.min(giveaway.participants.length, 10)); // Limit to 10 emojis max
        const updatedEmbed = new EmbedBuilder(embed.data)
          .setFooter({ text: `Giveaway ID: ${giveaway.id} • ${giveaway.participants.length} entries ${tadaCount}` });
        
        await interaction.message.edit({ embeds: [updatedEmbed], components: interaction.message.components });
      }
    } catch (error) {
      console.log('Could not update embed:', error.message);
    }

    await interaction.reply({ content: 'You have successfully entered the giveaway! 🎉', ephemeral: true });
  }

  async handleCheckEntries(interaction) {
    const giveawayId = interaction.customId.replace('check_entries_', '');
    const giveaway = this.giveaways.get(giveawayId);

    if (!giveaway) {
      await interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
      return;
    }

    // Check if user has permission
    const permissionManager = new (require('../utils/permissions')).PermissionManager();
    const hasPermission = await permissionManager.hasGiveawayPermission(interaction.member, interaction.guildId);
    
    if (!hasPermission) {
      await interaction.reply({ content: 'You need permission to check giveaway entries.', ephemeral: true });
      return;
    }

    if (!giveaway.participants.length) {
      await interaction.reply({ content: `No one has entered giveaway **${giveaway.prize}** yet.`, ephemeral: true });
      return;
    }

    const header = `**Entries for ${giveaway.prize}** (ID: ${giveaway.id})\n${giveaway.participants.length} total entries:`;
    const entries = giveaway.participants.map((id, index) => `${index + 1}. <@${id}>`);
    
    // Split into chunks if too many entries
    const chunkSize = 20;
    const chunks = [];
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(entries.slice(i, i + chunkSize).join('\n'));
    }

    const [first, ...rest] = chunks;
    await interaction.reply({ content: `${header}\n${first}`, ephemeral: true });
    
    for (const chunk of rest) {
      await interaction.followUp({ content: chunk, ephemeral: true });
    }
  }

  async handleRemoveEntry(interaction) {
    const giveawayId = interaction.customId.replace('remove_entry_', '');
    const giveaway = this.giveaways.get(giveawayId);

    if (!giveaway) {
      await interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
      return;
    }

    // Check if user has permission
    const permissionManager = new (require('../utils/permissions')).PermissionManager();
    const hasPermission = await permissionManager.hasGiveawayPermission(interaction.member, interaction.guildId);
    
    if (!hasPermission) {
      await interaction.reply({ content: 'You need permission to manage giveaway entries.', ephemeral: true });
      return;
    }

    await interaction.reply({ 
      content: 'Please mention the user whose entry you want to remove:', 
      ephemeral: true 
    });

    // Wait for the next message from this user
    const filter = (msg) => msg.author.id === interaction.user.id;
    
    try {
      const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000, 
        errors: ['time'] 
      });
      
      const message = collected.first();
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        await interaction.followUp({ content: 'No user mentioned. Operation cancelled.', ephemeral: true });
        return;
      }

      const userIndex = giveaway.participants.indexOf(mentionedUser.id);
      if (userIndex === -1) {
        await interaction.followUp({ content: `${mentionedUser.tag} is not entered in this giveaway.`, ephemeral: true });
        return;
      }

      // Remove from participants
      giveaway.participants.splice(userIndex, 1);
      this.saveGiveaways();

      // Update the giveaway message
      try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        
        // Remove their reaction
        const reaction = giveawayMessage.reactions.cache.find(r => r.emoji.name === '🎉');
        if (reaction) {
          await reaction.users.remove(mentionedUser.id);
        }

        // Update embed
        const embed = giveawayMessage.embeds[0];
        if (embed) {
          const tadaCount = '🎉'.repeat(Math.min(giveaway.participants.length, 10));
          const updatedEmbed = new EmbedBuilder(embed.data)
            .setFooter({ text: `Giveaway ID: ${giveaway.id} • ${giveaway.participants.length} entries ${tadaCount}` });
          
          await giveawayMessage.edit({ embeds: [updatedEmbed], components: giveawayMessage.components });
        }
      } catch (error) {
        console.log('Could not update giveaway message:', error.message);
      }

      await interaction.followUp({ 
        content: `✅ Removed ${mentionedUser.tag} from the giveaway. They now have ${giveaway.participants.length} entries.`, 
        ephemeral: true 
      });

      // Delete the user's message
      try {
        await message.delete();
      } catch (error) {
        console.log('Could not delete message:', error.message);
      }

    } catch (error) {
      await interaction.followUp({ content: 'Timed out waiting for user mention. Operation cancelled.', ephemeral: true });
    }
  }

  scheduleGiveaway(giveaway) {
    if (giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      return;
    }

    const delay = giveaway.endsAt - Date.now();
    if (delay <= 0) {
      this.endGiveaway(giveaway.id).catch((error) => {
        console.error('[GiveawayManager] Failed to close overdue giveaway:', error);
      });
      return;
    }

    this.clearTimer(giveaway.id);

    const maxDelay = 2 ** 31 - 1;
    if (delay > maxDelay) {
      const timer = setTimeout(() => this.scheduleGiveaway(giveaway), maxDelay);
      this.timers.set(giveaway.id, timer);
      return;
    }

    const timer = setTimeout(() => {
      this.endGiveaway(giveaway.id).catch((error) => {
        console.error('[GiveawayManager] Failed to end giveaway:', error);
      });
    }, delay);

    this.timers.set(giveaway.id, timer);
  }

  clearTimer(giveawayId) {
    const existing = this.timers.get(giveawayId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(giveawayId);
    }
  }

  async fetchMessageContext(giveaway) {
    const guild = await this.client.guilds.fetch(giveaway.guildId);
    const channel = await guild.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    return { guild, channel, message };
  }

  buildBaseEmbed(message, giveaway) {
    if (message.embeds?.length) {
      try {
        return EmbedBuilder.from(message.embeds[0]);
      } catch (error) {
        console.warn('[GiveawayManager] Failed to rebuild embed, creating a new one.', error);
      }
    }

    return new EmbedBuilder()
      .setTitle(giveaway.prize)
      .setFooter({ text: `Giveaway ID: ${giveaway.id}` });
  }

  buildDisabledRow(giveawayId, label) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${BUTTON_CUSTOM_ID_PREFIX}${giveawayId}-disabled`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }

  formatWinners(winnerIds) {
    if (!winnerIds?.length) {
      return 'No valid entries were received.';
    }

    if (winnerIds.length === 1) {
      return `🎉 Winner: <@${winnerIds[0]}>`;
    }

    const lines = winnerIds.map((id, index) => `${index + 1}. <@${id}>`);
    return `🎉 Winners:\n${lines.join('\n')}`;
  }

  async endGiveaway(giveawayId, { executorId = null } = {}) {
    const giveaway = this.giveaways.get(giveawayId);
    if (!giveaway || giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      return null;
    }

    this.clearTimer(giveawayId);

    let winnerIds = [];
    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway);
      const disabledRow = this.buildDisabledRow(giveaway.id, 'Giveaway Ended');

      if (giveaway.participants.length === 0) {
        baseEmbed
          .setDescription('No valid entries were received.')
          .setColor(0x992d22)
          .setTimestamp(new Date(giveaway.endsAt));

        await message.edit({ embeds: [baseEmbed], components: [disabledRow] });
        await channel.send(`No winner could be determined for **${giveaway.prize}**.`);
      } else {
        // Select multiple winners based on winnerCount
        const availableParticipants = [...giveaway.participants];
        const maxWinners = Math.min(giveaway.winnerCount || 1, availableParticipants.length);
        
        for (let i = 0; i < maxWinners; i++) {
          const randomIndex = Math.floor(Math.random() * availableParticipants.length);
          winnerIds.push(availableParticipants[randomIndex]);
          availableParticipants.splice(randomIndex, 1); // Remove selected winner to avoid duplicates
        }

        baseEmbed
          .setDescription(this.formatWinners(winnerIds))
          .setColor(0x2ecc71)
          .setTimestamp(new Date(giveaway.endsAt));

        await message.edit({ embeds: [baseEmbed], components: [disabledRow] });
        
        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
        const winnerText = winnerIds.length === 1 ? 'Congratulations' : 'Congratulations to our winners';
        await channel.send(`🎉 ${winnerText} ${winnerMentions}! You won **${giveaway.prize}**.`);
      }
    } catch (error) {
      console.error('[GiveawayManager] Error finalizing giveaway:', error);
    }

    giveaway.status = GIVEAWAY_STATUS.ENDED;
    giveaway.endedAt = Date.now();
    giveaway.endedBy = executorId;
    giveaway.winnerIds = winnerIds;

    this.giveaways.set(giveaway.id, giveaway);
    this.saveGiveaways();
    return giveaway;
  }

  async cancelGiveaway(identifier, executorId, reason = null) {
    const giveaway = this.resolveGiveaway(identifier);
    if (!giveaway) {
      throw new Error('Giveaway not found.');
    }

    if (giveaway.status !== GIVEAWAY_STATUS.ACTIVE) {
      throw new Error('Only active giveaways can be cancelled.');
    }

    this.clearTimer(giveaway.id);

    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway)
        .setDescription(`🚫 Giveaway cancelled by <@${executorId}>${reason ? `: ${reason}` : ''}`)
        .setColor(0x992d22)
        .setTimestamp(new Date());

      const disabledRow = this.buildDisabledRow(giveaway.id, 'Giveaway Cancelled');
      await message.edit({ embeds: [baseEmbed], components: [disabledRow] });
      await channel.send(`🚫 Giveaway **${giveaway.prize}** was cancelled by <@${executorId}>${reason ? `: ${reason}` : ''}.`);
    } catch (error) {
      console.error('[GiveawayManager] Error cancelling giveaway:', error);
    }

    giveaway.status = GIVEAWAY_STATUS.CANCELLED;
    giveaway.cancelledAt = Date.now();
    giveaway.cancelledBy = executorId;
    giveaway.cancelReason = reason;

    this.giveaways.set(giveaway.id, giveaway);
    this.saveGiveaways();
    return giveaway;
  }

  async rerollGiveaway(identifier, executorId) {
    const giveaway = this.resolveGiveaway(identifier);
    if (!giveaway) {
      throw new Error('Giveaway not found.');
    }

    if (giveaway.status !== GIVEAWAY_STATUS.ENDED) {
      throw new Error('Only ended giveaways can be rerolled.');
    }

    if (!giveaway.participants.length) {
      throw new Error('No participants were recorded for this giveaway.');
    }

    const available = giveaway.participants.filter((id) => !giveaway.winnerIds.includes(id));
    if (available.length === 0) {
      throw new Error('All participants have already won. No additional rerolls possible.');
    }

    const winnerId = available[Math.floor(Math.random() * available.length)];
    giveaway.winnerIds.push(winnerId);
    giveaway.lastRerolledAt = Date.now();
    giveaway.lastRerolledBy = executorId;

    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway)
        .setDescription(this.formatWinners(giveaway.winnerIds))
        .setColor(0x2ecc71)
        .setTimestamp(new Date(giveaway.endedAt || Date.now()));

      const disabledRow = this.buildDisabledRow(giveaway.id, 'Giveaway Ended');
      await message.edit({ embeds: [baseEmbed], components: [disabledRow] });
      await channel.send(`🔄 Reroll time! Congratulations <@${winnerId}> — you're a new winner of **${giveaway.prize}**.`);
    } catch (error) {
      console.error('[GiveawayManager] Error rerolling giveaway:', error);
    }

    this.giveaways.set(giveaway.id, giveaway);
    this.saveGiveaways();
    return winnerId;
  }

  isAdmin(member) {
    if (!member) {
      return false;
    }
    return member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
  }
}

GiveawayManager.STATUS = GIVEAWAY_STATUS;

module.exports = GiveawayManager;
