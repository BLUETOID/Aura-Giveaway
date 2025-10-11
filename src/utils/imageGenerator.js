const fetch = require('node-fetch');

class ImageGenerator {
    constructor() {
        // HTMLCSSToImage API credentials
        // Get free API key from https://htmlcsstoimage.com/
        this.apiUserId = process.env.HCTI_USER_ID || '';
        this.apiKey = process.env.HCTI_API_KEY || '';
        this.apiUrl = 'https://hcti.io/v1/image';
    }

    async generateProfileCard(userData) {
        const html = this.getProfileTemplate(userData);
        
        const data = {
            html: html,
            google_fonts: 'Inter:400,500,600,700,800'
        };

        const image = await fetch(this.apiUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(this.apiUserId + ':' + this.apiKey).toString('base64')
            }
        });

        const response = await image.json();
        
        if (response.url) {
            // Download the generated image
            const imageResponse = await fetch(response.url);
            return await imageResponse.buffer();
        }
        
        throw new Error('Failed to generate image: ' + JSON.stringify(response));
    }

    async generateActivityCard(data) {
        const html = this.getActivityTemplate(data);
        
        const requestData = {
            html: html,
            google_fonts: 'Poppins:400,600,700'
        };

        const image = await fetch(this.apiUrl, {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(this.apiUserId + ':' + this.apiKey).toString('base64')
            }
        });

        const response = await image.json();
        
        if (response.url) {
            // Download the generated image
            const imageResponse = await fetch(response.url);
            return await imageResponse.buffer();
        }
        
        throw new Error('Failed to generate image: ' + JSON.stringify(response));
    }

    getProfileTemplate(userData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    width: 1100px;
                    height: 400px;
                    background: #f4f5f7;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    overflow: hidden;
                    position: relative;
                    padding: 20px;
                }

                .card {
                    width: 100%;
                    height: 100%;
                    padding: 32px;
                    display: flex;
                    gap: 35px;
                    background: #ffffff;
                    border-radius: 28px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
                }
                
                /* Avatar section with enhanced effects */
                .avatar-section {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }
                
                .avatar-container {
                    position: relative;
                }
                
                .avatar-ring {
                    width: 184px;
                    height: 184px;
                    border-radius: 50%;
                    border: 6px solid #4c51bf;
                    background: #ffffff;
                    padding: 6px;
                    position: relative;
                }

                .avatar {
                    width: 172px;
                    height: 172px;
                    border-radius: 50%;
                    object-fit: cover;
                    object-position: center;
                    display: block;
                    background: #f1f5f9;
                }
                
                .level-badge {
                    background: #1f2937;
                    color: #ffffff;
                    padding: 10px 24px;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 18px;
                    letter-spacing: 1px;
                }
                
                /* Stats section */
                .stats-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    position: relative;
                }
                
                .header {
                    color: #111827;
                }
                
                .username {
                    font-size: 48px;
                    font-weight: 800;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }
                
                .activity-level {
                    font-size: 22px;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: #f3f4f6;
                    padding: 8px 18px;
                    border-radius: 20px;
                    border: 1px solid #e5e7eb;
                    font-weight: 600;
                    color: #374151;
                }
                
                /* XP Section with improved design */
                .xp-section {
                    background: #f9fafb;
                    padding: 20px;
                    border-radius: 20px;
                    border: 1px solid #e5e7eb;
                }
                
                .xp-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .xp-label {
                    color: #4b5563;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .xp-percentage {
                    color: #111827;
                    font-size: 18px;
                    font-weight: 700;
                }
                
                .xp-bar-container {
                    width: 100%;
                    height: 36px;
                    background: #e5e7eb;
                    border-radius: 18px;
                    overflow: hidden;
                    position: relative;
                }
                
                .xp-bar-fill {
                    height: 100%;
                    background: #4f46e5;
                    width: ${userData.progressPercent}%;
                    border-radius: 18px;
                    position: relative;
                }
                
                .xp-text {
                    color: #1f2937;
                    text-align: center;
                    margin-top: 10px;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                /* Rank cards with 3D effect */
                .rank-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }
                
                .rank-box {
                    background: #f3f4f6;
                    padding: 22px;
                    border-radius: 18px;
                    border: 1px solid #e5e7eb;
                }
                
                .rank-icon {
                    font-size: 38px;
                    margin-bottom: 8px;
                    color: #4c51bf;
                }
                
                .rank-value {
                    font-size: 42px;
                    font-weight: 800;
                    color: #111827;
                    letter-spacing: -1px;
                }
                
                .rank-label {
                    color: #4b5563;
                    font-size: 13px;
                    margin-top: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    font-weight: 600;
                }
                
                /* Footer branding */
                .footer {
                    position: absolute;
                    bottom: 15px;
                    right: 25px;
                    color: #6b7280;
                    font-size: 12px;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="avatar-section">
                    <div class="avatar-container">
                        <div class="avatar-glow"></div>
                        <div class="avatar-ring">
                            <img src="${userData.avatarUrl}" class="avatar" crossorigin="anonymous">
                        </div>
                    </div>
                    <div class="level-badge">Level ${userData.level}</div>
                </div>
                
                <div class="stats-section">
                    <div class="header">
                        <div class="username">${this.escapeHtml(userData.username)}</div>
                        <div class="activity-level">
                            <span>${userData.activityEmoji}</span>
                            <span>${userData.activityLevel}</span>
                        </div>
                    </div>
                    
                    <div class="xp-section">
                        <div class="xp-header">
                            <div class="xp-label">Experience Progress</div>
                            <div class="xp-percentage">${userData.progressPercent}%</div>
                        </div>
                        <div class="xp-bar-container">
                            <div class="xp-bar-fill"></div>
                        </div>
                        <div class="xp-text">
                            ${userData.xpProgress.toLocaleString()} / ${userData.xpNeeded.toLocaleString()} XP
                        </div>
                    </div>
                    
                    <div class="rank-section">
                        <div class="rank-box">
                            <div class="rank-icon">💬</div>
                            <div class="rank-value">#${userData.messageRank}</div>
                            <div class="rank-label">Message Rank</div>
                        </div>
                        <div class="rank-box">
                            <div class="rank-icon">🎤</div>
                            <div class="rank-value">#${userData.voiceRank}</div>
                            <div class="rank-label">Voice Rank</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="footer">Gaming Aura • ${new Date().toLocaleDateString()}</div>
        </body>
        </html>
        `;
    }

    getActivityTemplate(data) {
        const maxMessages = Math.max(...data.hourlyData.map(h => h.messages));
        const maxVoice = Math.max(...data.hourlyData.map(h => h.voice));
        const maxHeight = 200;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    width: 1200px;
                    height: 600px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: 'Poppins', sans-serif;
                    padding: 30px;
                }
                
                .container {
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 30px;
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                
                .title {
                    color: white;
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
                }
                
                .subtitle {
                    color: rgba(255,255,255,0.8);
                    font-size: 16px;
                    margin-bottom: 25px;
                }
                
                .stats-row {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                }
                
                .stat-box {
                    background: rgba(255,255,255,0.15);
                    padding: 15px;
                    border-radius: 12px;
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                .stat-label {
                    color: rgba(255,255,255,0.8);
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                
                .stat-value {
                    color: white;
                    font-size: 24px;
                    font-weight: 700;
                    text-shadow: 1px 1px 5px rgba(0,0,0,0.3);
                }
                
                .chart-container {
                    position: relative;
                    height: 300px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                }
                
                .bar-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }
                
                .bars {
                    width: 100%;
                    display: flex;
                    gap: 3px;
                    align-items: flex-end;
                    height: ${maxHeight}px;
                }
                
                .bar {
                    flex: 1;
                    border-radius: 4px 4px 0 0;
                    position: relative;
                    transition: all 0.3s;
                }
                
                .bar-message {
                    background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
                    box-shadow: 0 -2px 10px rgba(74, 222, 128, 0.3);
                }
                
                .bar-voice {
                    background: linear-gradient(180deg, #f472b6 0%, #ec4899 100%);
                    box-shadow: 0 -2px 10px rgba(244, 114, 182, 0.3);
                }
                
                .hour-label {
                    color: rgba(255,255,255,0.7);
                    font-size: 10px;
                    text-align: center;
                }
                
                .legend {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    margin-top: 15px;
                }
                
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: white;
                    font-size: 14px;
                }
                
                .legend-color {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                }
                
                .legend-color.message {
                    background: linear-gradient(135deg, #4ade80, #22c55e);
                }
                
                .legend-color.voice {
                    background: linear-gradient(135deg, #f472b6, #ec4899);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="title">📊 ${this.escapeHtml(data.title)}</div>
                <div class="subtitle">${this.escapeHtml(data.subtitle)}</div>
                
                <div class="stats-row">
                    <div class="stat-box">
                        <div class="stat-label">Total Messages</div>
                        <div class="stat-value">${data.totalMessages.toLocaleString()}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Voice Hours</div>
                        <div class="stat-value">${data.totalVoice.toFixed(1)}h</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Peak Hour</div>
                        <div class="stat-value">${data.peakHour}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Active Members</div>
                        <div class="stat-value">${data.activeMembers}</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    ${data.hourlyData.map(hour => {
                        const msgHeight = maxMessages > 0 ? (hour.messages / maxMessages) * maxHeight : 0;
                        const voiceHeight = maxVoice > 0 ? (hour.voice / maxVoice) * maxHeight : 0;
                        
                        return `
                            <div class="bar-group">
                                <div class="bars">
                                    <div class="bar bar-message" style="height: ${msgHeight}px"></div>
                                    <div class="bar bar-voice" style="height: ${voiceHeight}px"></div>
                                </div>
                                <div class="hour-label">${hour.label}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color message"></div>
                        <span>Messages</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color voice"></div>
                        <span>Voice Activity</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getGradient(activityLevel) {
        const gradients = {
            'Super Active': '#FF3CAC 0%, #784BA0 50%, #2B86C5 100%',      // Pink to purple to blue
            'Very Active': '#FA8BFF 0%, #2BD2FF 50%, #2BFF88 100%',       // Pink to cyan to green
            'Active': '#FDBB2D 0%, #22C1C3 100%',                         // Orange to teal
            'Regular': '#4FACFE 0%, #00F2FE 100%',                        // Light blue gradient
            'Occasional': '#667eea 0%, #764ba2 100%',                     // Purple gradient
            'Newcomer': '#A8EDEA 0%, #FED6E3 100%'                        // Soft mint to pink
        };
        return gradients[activityLevel] || '#667eea 0%, #764ba2 100%';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

module.exports = new ImageGenerator();
