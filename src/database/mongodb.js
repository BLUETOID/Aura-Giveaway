const mongoose = require('mongoose');

class MongoDB {
    constructor() {
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
    }

    /**
     * Connect to MongoDB Atlas
     * @returns {Promise<boolean>} Connection success status
     */
    async connect() {
        if (this.isConnected) {
            console.log('✅ Already connected to MongoDB');
            return true;
        }

        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            console.error('❌ MONGODB_URI environment variable is not set!');
            console.error('📖 Please add your MongoDB connection string to Heroku config vars');
            return false;
        }

        try {
            console.log('🔄 Connecting to MongoDB Atlas...');
            
            await mongoose.connect(mongoUri, {
                // Use new connection options
                serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            });

            this.isConnected = true;
            this.connectionRetries = 0;
            
            console.log('✅ Successfully connected to MongoDB Atlas!');
            console.log(`📊 Database: ${mongoose.connection.name}`);
            
            // Handle connection events
            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
                this.isConnected = false;
            });

            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err.message);
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected successfully');
                this.isConnected = true;
            });

            return true;

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            
            this.connectionRetries++;
            
            if (this.connectionRetries < this.maxRetries) {
                console.log(`🔄 Retrying connection (${this.connectionRetries}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                return this.connect(); // Retry
            } else {
                console.error('❌ Max connection retries reached. Please check your MONGODB_URI');
                return false;
            }
        }
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('👋 Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
        }
    }

    /**
     * Check if connected to MongoDB
     * @returns {boolean}
     */
    isDBConnected() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    /**
     * Get connection status
     * @returns {string}
     */
    getConnectionStatus() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[mongoose.connection.readyState] || 'unknown';
    }
}

// Export singleton instance
const mongoDBInstance = new MongoDB();
module.exports = mongoDBInstance;
