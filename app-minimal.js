require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

console.log('🔧 Starting SmashLabs Backend Server (Minimal Version)...');
console.log('📊 Environment Variables Check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not Set'}`);

// MongoDB Connection
const connectDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Test the connection
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📊 Database collections: ${collections.map(c => c.name).join(', ')}`);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Don't exit - let the app run without DB for testing
    }
};

// Health check endpoint (most important for Railway)
app.get('/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'SmashLabs Backend is running (minimal version)',
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SmashLabs Backend API (Minimal Version)',
        status: 'Running',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Test endpoint working!',
        env: process.env.NODE_ENV,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
        mongoStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

const PORT = process.env.PORT || 5000;

// Start server and connect to database
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SmashLabs Backend Server (Minimal) running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Health check: http://localhost:${PORT}/health`);
            console.log('✅ Server is ready to accept connections!');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app; 