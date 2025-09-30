const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Check the bot\'s ping and latency',
  usage: 'ping',
  category: 'Utility',
  
  async execute(message, args, { client }) {
    const start = Date.now();
    
    // Send initial message to calculate message latency
    const msg = await message.reply('🏓 Pinging...');
    
    const messageLatency = Date.now() - start;
    const apiLatency = Math.round(client.ws.ping);
    
    // Determine ping quality and emoji
    let pingEmoji = '🟢';
    let pingQuality = 'Excellent';
    
    if (apiLatency > 200) {
      pingEmoji = '🟡';
      pingQuality = 'Good';
    }
    if (apiLatency > 400) {
      pingEmoji = '🟠';
      pingQuality = 'Fair';
    }
    if (apiLatency > 600) {
      pingEmoji = '🔴';
      pingQuality = 'Poor';
    }
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🏓 Pong!')
      .setDescription(`Bot latency information`)
      .addFields(
        { 
          name: '📡 API Latency', 
          value: `${pingEmoji} ${apiLatency}ms (${pingQuality})`, 
          inline: true 
        },
        { 
          name: '💬 Message Latency', 
          value: `⚡ ${messageLatency}ms`, 
          inline: true 
        },
        {
          name: '📊 Bot Status',
          value: `✅ Online\n🏠 Serving ${client.guilds.cache.size} servers`,
          inline: false
        }
      )
      .setFooter({ 
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();
    
    await msg.edit({ content: '', embeds: [embed] });
  },
};