require('dotenv').config();
const express = require('express');

console.log('🔧 Starting SmashLabs Backend Server (Fixed Version)...');
console.log('📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);

const app = express();

// Middleware - Keep it minimal
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Add basic CORS manually (avoid CORS library issues)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// EXPLICIT ROUTE DEFINITIONS

// Health check - Railway's most important endpoint
app.get('/health', (req, res) => {
    console.log('Health check called');
    res.status(200).json({
        status: 'OK',
        message: 'SmashLabs Backend Fixed Version Running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000
    });
});

// Root endpoint
app.get('/', (req, res) => {
    console.log('Root endpoint called');
    res.status(200).json({
        message: 'SmashLabs Backend API - Fixed Version',
        status: 'Running',
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /health',
            'GET /',
            'GET /test',
            'GET /debug'
        ]
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    console.log('Test endpoint called');
    res.status(200).json({
        message: 'Test endpoint working perfectly!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        nodeVersion: process.version
    });
});

// Debug endpoint
app.get('/debug', (req, res) => {
    console.log('Debug endpoint called');
    res.status(200).json({
        message: 'Debug information',
        timestamp: new Date().toISOString(),
        server: {
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime()
        },
        routes: [
            'GET /health',
            'GET /',
            'GET /test', 
            'GET /debug'
        ]
    });
});

// Catch all 404s
app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found',
        requestedRoute: `${req.method} ${req.originalUrl}`,
        availableRoutes: [
            'GET /health',
            'GET /',
            'GET /test',
            'GET /debug'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmashLabs Backend (Fixed) running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('✅ All routes registered successfully!');
    console.log('Available endpoints:');
    console.log(`   - GET /health`);
    console.log(`   - GET /`);
    console.log(`   - GET /test`);
    console.log(`   - GET /debug`);
});

module.exports = app; 