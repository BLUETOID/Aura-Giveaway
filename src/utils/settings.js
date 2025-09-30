const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../../data/settings.json');

class SettingsManager {
  constructor(defaultPrefix = '!') {
    this.defaultPrefix = defaultPrefix;
    this.settings = new Map();
    this.ensureStorage();
    this.load();
  }

  ensureStorage() {
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, '{}', 'utf8');
    }
  }

  load() {
    try {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const data = JSON.parse(raw);
      for (const [guildId, options] of Object.entries(data)) {
        this.settings.set(guildId, options);
      }
    } catch (error) {
      console.error('[SettingsManager] Failed to load settings:', error);
    }
  }

  save() {
    try {
      const payload = Object.fromEntries(this.settings.entries());
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch (error) {
      console.error('[SettingsManager] Failed to save settings:', error);
    }
  }

  getGuildSettings(guildId) {
    if (!guildId) {
      return { prefix: this.defaultPrefix };
    }

    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, { prefix: this.defaultPrefix });
    }

    return this.settings.get(guildId);
  }

  getPrefix(guildId) {
    const settings = this.getGuildSettings(guildId);
    return settings.prefix || this.defaultPrefix;
  }

  setPrefix(guildId, newPrefix) {
    if (!guildId) {
      throw new Error('Guild ID is required to set prefix.');
    }
    if (typeof newPrefix !== 'string' || newPrefix.trim().length === 0) {
      throw new Error('Prefix must be a non-empty string.');
    }

    const sanitized = newPrefix.trim();
    if (sanitized.length > 5) {
      throw new Error('Prefix must be at most 5 characters long.');
    }

    const settings = this.getGuildSettings(guildId);
    settings.prefix = sanitized;
    this.settings.set(guildId, settings);
    this.save();
    return sanitized;
  }
}

module.exports = SettingsManager;
