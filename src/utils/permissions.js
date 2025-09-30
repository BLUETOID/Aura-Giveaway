const { PermissionsBitField } = require('discord.js');
const SettingsManager = require('./settings');

class PermissionManager {
  constructor() {
    this.settingsManager = new SettingsManager();
  }

  /**
   * Check if a member has permission to use giveaway commands
   * @param {GuildMember} member - The guild member to check
   * @param {string} guildId - The guild ID
   * @returns {Promise<boolean>} - Whether the member has permission
   */
  async hasGiveawayPermission(member, guildId) {
    if (!member) return false;

    // Check if user has admin permissions (always allowed)
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return true;
    }

    // Check if user has allowed roles
    const settings = this.settingsManager.getGuildSettings(guildId);
    const allowedRoles = settings.allowedRoles || [];

    if (allowedRoles.length === 0) {
      // If no allowed roles are set, only admins can use commands
      return false;
    }

    // Check if user has any of the allowed roles
    return allowedRoles.some(roleId => member.roles.cache.has(roleId));
  }

  /**
   * Add an allowed role for giveaway commands
   * @param {string} guildId - The guild ID
   * @param {string} roleId - The role ID to add
   * @returns {Promise<void>}
   */
  async addAllowedRole(guildId, roleId) {
    const settings = this.settingsManager.getGuildSettings(guildId);
    if (!settings.allowedRoles) {
      settings.allowedRoles = [];
    }
    
    if (!settings.allowedRoles.includes(roleId)) {
      settings.allowedRoles.push(roleId);
      this.settingsManager.settings.set(guildId, settings);
      this.settingsManager.save();
    }
  }

  /**
   * Remove an allowed role for giveaway commands
   * @param {string} guildId - The guild ID
   * @param {string} roleId - The role ID to remove
   * @returns {Promise<void>}
   */
  async removeAllowedRole(guildId, roleId) {
    const settings = this.settingsManager.getGuildSettings(guildId);
    if (!settings.allowedRoles) {
      return;
    }

    settings.allowedRoles = settings.allowedRoles.filter(id => id !== roleId);
    this.settingsManager.settings.set(guildId, settings);
    this.settingsManager.save();
  }

  /**
   * Get all allowed roles for a guild
   * @param {string} guildId - The guild ID
   * @returns {Promise<string[]>} - Array of role IDs
   */
  async getAllowedRoles(guildId) {
    const settings = this.settingsManager.getGuildSettings(guildId);
    return settings.allowedRoles || [];
  }
}

module.exports = { PermissionManager };