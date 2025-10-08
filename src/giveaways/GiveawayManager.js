const { randomUUID } = require('crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { formatDuration } = require('../utils/duration');
const { Giveaway } = require('../database/schemas');
const mongodb = require('../database/mongodb');

const BUTTON_CUSTOM_ID_PREFIX = 'giveaway-enter-';

class GiveawayManager {
  constructor() {
    this.client = null;
    this.timers = new Map();
  }

  async init(client) {
    this.client = client;
    
    // Ensure MongoDB is connected
    if (!mongodb.isDBConnected()) {
      console.warn('⚠️ MongoDB not connected. Giveaway features may not work properly.');
      return;
    }

    console.log('🎉 Loading active giveaways from database...');
    
    // Load all active giveaways and schedule them
    try {
      const activeGiveaways = await Giveaway.find({ ended: false });
      console.log(`📋 Found ${activeGiveaways.length} active giveaway(s)`);
      
      for (const giveaway of activeGiveaways) {
        this.scheduleGiveaway(giveaway);
      }
    } catch (error) {
      console.error('❌ Error loading giveaways:', error.message);
    }
  }

  async cleanupOldGiveaways() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);

    try {
      const result = await Giveaway.deleteMany({
        ended: true,
        endTime: { $lt: cutoffDate }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old giveaway(s) (older than 7 days)`);
      }

      return result.deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old giveaways:', error.message);
      return 0;
    }
  }

  async getGiveaway(giveawayId) {
    try {
      return await Giveaway.findOne({ messageId: giveawayId });
    } catch (error) {
      console.error('❌ Error fetching giveaway:', error.message);
      return null;
    }
  }

  async resolveGiveaway(identifier) {
    if (!identifier) {
      return null;
    }

    try {
      // Try to find by message ID
      let giveaway = await Giveaway.findOne({ messageId: identifier });
      if (giveaway) return giveaway;

      // Extract message ID from various formats (URL, mention, etc.)
      const match = identifier.match(/\d{17,}/g);
      const messageId = match ? match.pop() : null;
      
      if (messageId) {
        giveaway = await Giveaway.findOne({ messageId });
        if (giveaway) return giveaway;
      }

      return null;
    } catch (error) {
      console.error('❌ Error resolving giveaway:', error.message);
      return null;
    }
  }

  async getActiveGiveaways() {
    try {
      return await Giveaway.find({ ended: false }).sort({ endTime: 1 });
    } catch (error) {
      console.error('❌ Error fetching active giveaways:', error.message);
      return [];
    }
  }

  async getAllGiveaways() {
    try {
      return await Giveaway.find().sort({ createdAt: -1 }).limit(100);
    } catch (error) {
      console.error('❌ Error fetching all giveaways:', error.message);
      return [];
    }
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

    const endTime = new Date(Date.now() + durationMs);
    const winnerText = winnerCount === 1 ? '1 Winner' : `${winnerCount} Winners`;
    
    const embed = new EmbedBuilder()
      .setTitle(prize)
      .setDescription('React with 🎉 below to enter the giveaway!')
      .addFields(
        { name: 'Hosted by', value: `<@${hostId}>`, inline: true },
        { name: 'Winners', value: winnerText, inline: true },
        { name: 'Ends in', value: formatDuration(durationMs), inline: true }
      )
      .setFooter({ text: '0 entries' })
      .setTimestamp(endTime)
      .setColor(0x5865f2);

    if (requirements.roleId) {
      embed.addFields({
        name: 'Requirements',
        value: `Must have <@&${requirements.roleId}>`
      });
    }

    const message = await channel.send({ embeds: [embed] });

    // Add initial tada emoji
    try {
      await message.react('🎉');
    } catch (error) {
      console.log('Could not add initial reaction:', error.message);
    }

    // Create giveaway in database
    const giveaway = new Giveaway({
      messageId: message.id,
      channelId,
      guildId,
      hostId,
      prize,
      winnerCount,
      endTime,
      entries: [],
      ended: false,
      winners: []
    });

    await giveaway.save();
    console.log(`✅ Created giveaway: ${prize} (${giveaway.messageId})`);

    this.scheduleGiveaway(giveaway);

    return giveaway;
  }

  async handleReactionAdd(reaction, user) {
    if (user.bot || reaction.emoji.name !== '🎉') {
      return;
    }

    const message = reaction.message;
    const giveaway = await Giveaway.findOne({ messageId: message.id });
    
    if (!giveaway || giveaway.ended) {
      return;
    }

    if (Date.now() >= giveaway.endTime) {
      return;
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return;
    }

    // Add user to entries if not already there
    if (!giveaway.entries.includes(user.id)) {
      giveaway.entries.push(user.id);
      await giveaway.save();

      // Update embed footer with entry count
      try {
        const embed = message.embeds[0];
        if (embed) {
          const updatedEmbed = new EmbedBuilder(embed.data)
            .setFooter({ text: `${giveaway.entries.length} entries` });
          
          await message.edit({ embeds: [updatedEmbed] });
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
    const giveaway = await Giveaway.findOne({ messageId: message.id });
    
    if (!giveaway || giveaway.ended) {
      return;
    }

    // Remove user from entries
    const index = giveaway.entries.indexOf(user.id);
    if (index > -1) {
      giveaway.entries.splice(index, 1);
      await giveaway.save();

      // Update embed footer with entry count
      try {
        const embed = message.embeds[0];
        if (embed) {
          const updatedEmbed = new EmbedBuilder(embed.data)
            .setFooter({ text: `${giveaway.entries.length} entries` });
          
          await message.edit({ embeds: [updatedEmbed] });
        }
      } catch (error) {
        console.log('Could not update embed:', error.message);
      }
    }
  }

  scheduleGiveaway(giveaway) {
    if (giveaway.ended) {
      return;
    }

    const delay = new Date(giveaway.endTime).getTime() - Date.now();
    if (delay <= 0) {
      this.endGiveaway(giveaway.messageId).catch((error) => {
        console.error('[GiveawayManager] Failed to close overdue giveaway:', error);
      });
      return;
    }

    this.clearTimer(giveaway.messageId);

    const maxDelay = 2 ** 31 - 1;
    if (delay > maxDelay) {
      const timer = setTimeout(() => this.scheduleGiveaway(giveaway), maxDelay);
      this.timers.set(giveaway.messageId, timer);
      return;
    }

    const timer = setTimeout(() => {
      this.endGiveaway(giveaway.messageId).catch((error) => {
        console.error('[GiveawayManager] Failed to end giveaway:', error);
      });
    }, delay);

    this.timers.set(giveaway.messageId, timer);
  }

  clearTimer(messageId) {
    const existing = this.timers.get(messageId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(messageId);
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
      .setFooter({ text: `${giveaway.entries.length} entries` });
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

  async endGiveaway(messageId, { executorId = null } = {}) {
    const giveaway = await Giveaway.findOne({ messageId });
    if (!giveaway || giveaway.ended) {
      return null;
    }

    this.clearTimer(messageId);

    let winnerIds = [];
    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway);

      if (giveaway.entries.length === 0) {
        baseEmbed
          .setDescription('No valid entries were received.')
          .setColor(0x992d22)
          .setTimestamp(new Date(giveaway.endTime));

        await message.edit({ embeds: [baseEmbed] });
        await channel.send(`No winner could be determined for **${giveaway.prize}**.`);
      } else {
        // Select multiple winners based on winnerCount
        const availableEntries = [...giveaway.entries];
        const maxWinners = Math.min(giveaway.winnerCount, availableEntries.length);
        
        for (let i = 0; i < maxWinners; i++) {
          const randomIndex = Math.floor(Math.random() * availableEntries.length);
          winnerIds.push(availableEntries[randomIndex]);
          availableEntries.splice(randomIndex, 1);
        }

        baseEmbed
          .setDescription(this.formatWinners(winnerIds))
          .setColor(0x2ecc71)
          .setTimestamp(new Date(giveaway.endTime));

        await message.edit({ embeds: [baseEmbed] });
        
        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
        const winnerText = winnerIds.length === 1 ? 'Congratulations' : 'Congratulations to our winners';
        await channel.send(`🎉 ${winnerText} ${winnerMentions}! You won **${giveaway.prize}**.`);
      }
    } catch (error) {
      console.error('[GiveawayManager] Error finalizing giveaway:', error);
    }

    giveaway.ended = true;
    giveaway.winners = winnerIds;
    await giveaway.save();

    console.log(`✅ Ended giveaway: ${giveaway.prize} (${winnerIds.length} winner(s))`);
    return giveaway;
  }

  async cancelGiveaway(identifier, executorId, reason = null) {
    const giveaway = await this.resolveGiveaway(identifier);
    if (!giveaway) {
      throw new Error('Giveaway not found.');
    }

    if (giveaway.ended) {
      throw new Error('Only active giveaways can be cancelled.');
    }

    this.clearTimer(giveaway.messageId);

    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway)
        .setDescription(`🚫 Giveaway cancelled by <@${executorId}>${reason ? `: ${reason}` : ''}`)
        .setColor(0x992d22)
        .setTimestamp(new Date());

      await message.edit({ embeds: [baseEmbed] });
      await channel.send(`🚫 Giveaway **${giveaway.prize}** was cancelled by <@${executorId}>${reason ? `: ${reason}` : ''}.`);
    } catch (error) {
      console.error('[GiveawayManager] Error cancelling giveaway:', error);
    }

    giveaway.ended = true;
    await giveaway.save();

    console.log(`🚫 Cancelled giveaway: ${giveaway.prize}`);
    return giveaway;
  }

  async rerollGiveaway(identifier, executorId) {
    const giveaway = await this.resolveGiveaway(identifier);
    if (!giveaway) {
      throw new Error('Giveaway not found.');
    }

    if (!giveaway.ended) {
      throw new Error('Only ended giveaways can be rerolled.');
    }

    if (!giveaway.entries.length) {
      throw new Error('No participants were recorded for this giveaway.');
    }

    const available = giveaway.entries.filter((id) => !giveaway.winners.includes(id));
    if (available.length === 0) {
      throw new Error('All participants have already won. No additional rerolls possible.');
    }

    const winnerId = available[Math.floor(Math.random() * available.length)];
    giveaway.winners.push(winnerId);
    await giveaway.save();

    try {
      const { channel, message } = await this.fetchMessageContext(giveaway);
      const baseEmbed = this.buildBaseEmbed(message, giveaway)
        .setDescription(this.formatWinners(giveaway.winners))
        .setColor(0x2ecc71)
        .setTimestamp(new Date(giveaway.endTime));

      await message.edit({ embeds: [baseEmbed] });
      await channel.send(`🔄 Reroll time! Congratulations <@${winnerId}> — you're a new winner of **${giveaway.prize}**.`);
    } catch (error) {
      console.error('[GiveawayManager] Error rerolling giveaway:', error);
    }

    console.log(`🔄 Rerolled giveaway: ${giveaway.prize} - New winner: ${winnerId}`);
    return winnerId;
  }

  isAdmin(member) {
    if (!member) {
      return false;
    }
    return member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
  }
}

module.exports = GiveawayManager;
