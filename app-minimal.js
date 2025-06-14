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

// Health check endpoint (most important for Railway)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'SmashLabs Backend is running (minimal version)'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SmashLabs Backend API (Minimal Version)',
        status: 'Running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Test endpoint working!',
        env: process.env.NODE_ENV,
        mongoUri: process.env.MONGODB_URI ? 'Connected' : 'Not Set'
    });
});

const PORT = process.env.PORT || 5000;

// Start server without MongoDB first (to test basic functionality)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmashLabs Backend Server (Minimal) running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log('✅ Server is ready to accept connections!');
});

module.exports = app; 