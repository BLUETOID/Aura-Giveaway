const { Statistics } = require('../src/database/schemas');
const mongodb = require('../src/database/mongodb');

async function cleanupHourlyActivityData() {
  try {
    console.log('🔧 Starting hourly activity data cleanup...');

    // Connect to database
    await mongodb.connect();

    // Find all statistics documents
    const allStats = await Statistics.find();
    console.log(`📊 Found ${allStats.length} statistics documents to check`);

    let fixedCount = 0;
    let corruptedCount = 0;

    for (const stats of allStats) {
      let needsSave = false;

      for (const dayStat of stats.dailyStats) {
        if (dayStat.hourlyActivity) {
          // Check messages array
          if (Array.isArray(dayStat.hourlyActivity.messages)) {
            // Check if any element is not a number
            for (let i = 0; i < dayStat.hourlyActivity.messages.length; i++) {
              const msg = dayStat.hourlyActivity.messages[i];
              if (typeof msg !== 'number') {
                console.log(`🔧 Fixing corrupted message data in guild ${stats.guildId} for date ${dayStat.date}`);
                corruptedCount++;
                // Reset to proper format
                dayStat.hourlyActivity.messages = Array(24).fill(0);
                dayStat.hourlyActivity.voiceMinutes = Array(24).fill(0);
                dayStat.hourlyActivity.membersOnline = Array(24).fill(0);
                needsSave = true;
                break;
              }
            }
          } else {
            // Initialize if missing
            dayStat.hourlyActivity.messages = Array(24).fill(0);
            dayStat.hourlyActivity.voiceMinutes = Array(24).fill(0);
            dayStat.hourlyActivity.membersOnline = Array(24).fill(0);
            needsSave = true;
          }

          // Ensure voiceMinutes is an array of numbers
          if (!Array.isArray(dayStat.hourlyActivity.voiceMinutes) ||
              dayStat.hourlyActivity.voiceMinutes.some(v => typeof v !== 'number')) {
            dayStat.hourlyActivity.voiceMinutes = Array(24).fill(0);
            needsSave = true;
          }

          // Ensure membersOnline is an array of numbers
          if (!Array.isArray(dayStat.hourlyActivity.membersOnline) ||
              dayStat.hourlyActivity.membersOnline.some(v => typeof v !== 'number')) {
            dayStat.hourlyActivity.membersOnline = Array(24).fill(0);
            needsSave = true;
          }
        } else {
          // Initialize missing hourlyActivity
          dayStat.hourlyActivity = {
            messages: Array(24).fill(0),
            voiceMinutes: Array(24).fill(0),
            membersOnline: Array(24).fill(0)
          };
          needsSave = true;
        }
      }

      if (needsSave) {
        await stats.save();
        fixedCount++;
        console.log(`✅ Fixed data for guild ${stats.guildId}`);
      }
    }

    console.log(`🎉 Cleanup complete! Fixed ${fixedCount} documents, found ${corruptedCount} corrupted entries`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongodb.disconnect();
  }
}

// Run the cleanup
cleanupHourlyActivityData();