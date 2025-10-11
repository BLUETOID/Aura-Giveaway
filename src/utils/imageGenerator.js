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
        await page.setViewport({ width: 1100, height: 400 });
        
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
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    width: 1100px;
                    height: 400px;
                    background: linear-gradient(135deg, ${this.getGradient(userData.activityLevel)});
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                
                /* Animated background effects */
                .bg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                radial-gradient(circle at 70% 80%, rgba(255,255,255,0.08) 0%, transparent 50%);
                    z-index: 0;
                }
                
                .bg-pattern {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.03;
                    background-image: 
                        repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px);
                    z-index: 0;
                }
                
                .card {
                    width: 100%;
                    height: 100%;
                    padding: 40px;
                    display: flex;
                    gap: 35px;
                    position: relative;
                    z-index: 1;
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
                
                .avatar-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 220px;
                    height: 220px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
                    filter: blur(20px);
                    z-index: 0;
                }
                
                .avatar-ring {
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FFD93D 0%, #FF6B9D 50%, #C724B1 100%);
                    padding: 5px;
                    position: relative;
                    z-index: 1;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                
                .avatar {
                    width: 190px;
                    height: 190px;
                    border-radius: 50%;
                    border: 4px solid rgba(0,0,0,0.2);
                    background: #1a1a1a;
                    object-fit: cover;
                }
                
                .level-badge {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 10px 24px;
                    border-radius: 25px;
                    font-weight: 800;
                    font-size: 20px;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                    border: 2px solid rgba(255,255,255,0.3);
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
                    color: white;
                }
                
                .username {
                    font-size: 48px;
                    font-weight: 800;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                    background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.85) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .activity-level {
                    font-size: 22px;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px);
                    padding: 8px 18px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.3);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    font-weight: 600;
                }
                
                /* XP Section with improved design */
                .xp-section {
                    background: rgba(0,0,0,0.25);
                    backdrop-filter: blur(15px);
                    padding: 20px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.15);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                }
                
                .xp-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .xp-label {
                    color: rgba(255,255,255,0.9);
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .xp-percentage {
                    color: white;
                    font-size: 18px;
                    font-weight: 700;
                }
                
                .xp-bar-container {
                    width: 100%;
                    height: 36px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 18px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: inset 0 4px 8px rgba(0,0,0,0.4);
                }
                
                .xp-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                    background-size: 200% 100%;
                    width: ${userData.progressPercent}%;
                    border-radius: 18px;
                    position: relative;
                    box-shadow: 0 0 20px rgba(118, 75, 162, 0.6);
                }
                
                .xp-bar-fill::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent);
                    border-radius: 18px 18px 0 0;
                }
                
                .xp-bar-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .xp-text {
                    color: white;
                    text-align: center;
                    margin-top: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
                
                /* Rank cards with 3D effect */
                .rank-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }
                
                .rank-box {
                    background: rgba(255,255,255,0.18);
                    backdrop-filter: blur(15px);
                    padding: 22px;
                    border-radius: 18px;
                    border: 1px solid rgba(255,255,255,0.25);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.25),
                                inset 0 1px 0 rgba(255,255,255,0.2);
                    position: relative;
                    overflow: hidden;
                }
                
                .rank-box::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
                    pointer-events: none;
                }
                
                .rank-icon {
                    font-size: 38px;
                    margin-bottom: 8px;
                    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
                }
                
                .rank-value {
                    font-size: 42px;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 3px 8px rgba(0,0,0,0.4);
                    letter-spacing: -1px;
                }
                
                .rank-label {
                    color: rgba(255,255,255,0.95);
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
                    color: rgba(255,255,255,0.6);
                    font-size: 12px;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }
            </style>
        </head>
        <body>
            <div class="bg-overlay"></div>
            <div class="bg-pattern"></div>
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

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new ImageGenerator();
