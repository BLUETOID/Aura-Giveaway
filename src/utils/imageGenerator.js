const puppeteer = require('puppeteer');

class ImageGenerator {
    constructor() {
        this.browser = null;
    }

    async init() {
        if (!this.browser) {
            const launchOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer'
                ]
            };

            // Use Chrome installed by Heroku buildpack if available
            // The chrome-for-testing buildpack installs Chrome at this path
            if (process.env.CHROME_BIN) {
                launchOptions.executablePath = process.env.CHROME_BIN;
            } else if (process.env.DYNO) {
                // On Heroku, the chrome-for-testing buildpack installs here
                launchOptions.executablePath = '/app/.chrome-for-testing/chrome-linux64/chrome';
            }

            this.browser = await puppeteer.launch(launchOptions);
        }
    }

    async generateProfileCard(userData) {
        await this.init();
        
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1000, height: 350 });
        
        const html = this.getProfileTemplate(userData);
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const screenshot = await page.screenshot({
            type: 'png',
            omitBackground: false
        });
        
        await page.close();
        return screenshot;
    }

    async generateActivityCard(data) {
        await this.init();
        
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1200, height: 600 });
        
        const html = this.getActivityTemplate(data);
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const screenshot = await page.screenshot({
            type: 'png',
            omitBackground: false
        });
        
        await page.close();
        return screenshot;
    }

    getProfileTemplate(userData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    width: 1000px;
                    height: 350px;
                    background: linear-gradient(135deg, ${this.getGradient(userData.activityLevel)});
                    font-family: 'Poppins', sans-serif;
                    overflow: hidden;
                }
                
                .card {
                    width: 100%;
                    height: 100%;
                    padding: 30px;
                    display: flex;
                    gap: 30px;
                    position: relative;
                }
                
                .background-pattern {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.05;
                    background-image: 
                        radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
                        radial-gradient(circle at 80% 80%, white 2px, transparent 2px);
                    background-size: 40px 40px;
                }
                
                .avatar-section {
                    position: relative;
                    z-index: 1;
                }
                
                .avatar-ring {
                    width: 180px;
                    height: 180px;
                    border-radius: 50%;
                    background: linear-gradient(45deg, #f093fb, #f5576c, #4facfe, #00f2fe);
                    background-size: 300% 300%;
                    padding: 4px;
                    animation: gradient 3s ease infinite;
                }
                
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                .avatar {
                    width: 172px;
                    height: 172px;
                    border-radius: 50%;
                    border: 3px solid rgba(0,0,0,0.5);
                    background: #333;
                }
                
                .level-badge {
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 18px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                }
                
                .stats-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                    z-index: 1;
                }
                
                .header {
                    color: white;
                }
                
                .username {
                    font-size: 42px;
                    font-weight: 700;
                    text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
                    margin-bottom: 5px;
                }
                
                .activity-level {
                    font-size: 24px;
                    opacity: 0.95;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-shadow: 1px 1px 5px rgba(0,0,0,0.5);
                }
                
                .xp-section {
                    margin: 15px 0;
                }
                
                .xp-bar-container {
                    width: 100%;
                    height: 30px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: inset 0 2px 5px rgba(0,0,0,0.3);
                }
                
                .xp-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                    width: ${userData.progressPercent}%;
                    border-radius: 20px;
                    position: relative;
                }
                
                .xp-bar-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
                    border-radius: 20px 20px 0 0;
                }
                
                .xp-text {
                    color: white;
                    text-align: center;
                    margin-top: 6px;
                    font-size: 16px;
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
                }
                
                .rank-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                
                .rank-box {
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(10px);
                    padding: 20px;
                    border-radius: 15px;
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                
                .rank-icon {
                    font-size: 32px;
                    margin-bottom: 5px;
                }
                
                .rank-value {
                    font-size: 36px;
                    font-weight: 700;
                    color: white;
                    text-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                }
                
                .rank-label {
                    color: rgba(255,255,255,0.9);
                    font-size: 14px;
                    margin-top: 3px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .footer {
                    position: absolute;
                    bottom: 10px;
                    right: 20px;
                    color: rgba(255,255,255,0.5);
                    font-size: 11px;
                }
            </style>
        </head>
        <body>
            <div class="background-pattern"></div>
            <div class="card">
                <div class="avatar-section">
                    <div class="avatar-ring">
                        <img src="${userData.avatarUrl}" class="avatar" crossorigin="anonymous">
                    </div>
                    <div class="level-badge">LEVEL ${userData.level}</div>
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
            'Super Active': '#ff4444 0%, #cc0000 100%',
            'Very Active': '#ff8800 0%, #ff4400 100%',
            'Active': '#ffaa00 0%, #ff6600 100%',
            'Regular': '#00ff88 0%, #00aa44 100%',
            'Occasional': '#00aaff 0%, #0055aa 100%',
            'Newcomer': '#aaaaaa 0%, #666666 100%'
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

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new ImageGenerator();
