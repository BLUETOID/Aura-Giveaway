const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s ping and latency'),
  
  async execute(interaction, { client }) {
    const start = Date.now();
    
    // Defer reply to calculate interaction latency
    await interaction.deferReply();
    
    const interactionLatency = Date.now() - start;
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
          name: '⚡ Interaction Latency', 
          value: `💬 ${interactionLatency}ms`, 
          inline: true 
        },
        {
          name: '📊 Bot Status',
          value: `✅ Online\n🏠 Serving ${client.guilds.cache.size} servers`,
          inline: false
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  },
};