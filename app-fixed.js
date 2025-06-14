require('dotenv').config();
const express = require('express');

const VERSION_ID = `v${Date.now()}`;
const STARTUP_TIME = new Date().toISOString();

console.log(`🔧 Starting SmashLabs Backend Server (Fixed Version ${VERSION_ID})...`);
console.log(`🕐 Startup Time: ${STARTUP_TIME}`);
console.log('📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);

const app = express();

// Middleware - Keep it minimal
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Version: ${VERSION_ID}`);
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

console.log('📍 Registering routes...');

// Health check - Railway's most important endpoint
app.get('/health', (req, res) => {
    console.log(`✅ Health check called - Version: ${VERSION_ID}`);
    res.status(200).json({
        status: 'OK',
        message: `SmashLabs Backend Fixed Version Running`,
        timestamp: new Date().toISOString(),
        startupTime: STARTUP_TIME,
        version: VERSION_ID,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000
    });
});
console.log('✅ Health route registered');

// Root endpoint
app.get('/', (req, res) => {
    console.log(`🏠 Root endpoint called - Version: ${VERSION_ID}`);
    res.status(200).json({
        message: `SmashLabs Backend API - Fixed Version ${VERSION_ID}`,
        status: 'Running',
        timestamp: new Date().toISOString(),
        startupTime: STARTUP_TIME,
        version: VERSION_ID,
        availableEndpoints: [
            'GET /health',
            'GET /',
            'GET /test',
            'GET /debug'
        ]
    });
});
console.log('✅ Root route registered');

// Test endpoint
app.get('/test', (req, res) => {
    console.log(`🧪 Test endpoint called - Version: ${VERSION_ID}`);
    res.status(200).json({
        message: `Test endpoint working perfectly! Version: ${VERSION_ID}`,
        timestamp: new Date().toISOString(),
        startupTime: STARTUP_TIME,
        version: VERSION_ID,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        nodeVersion: process.version
    });
});
console.log('✅ Test route registered');

// Debug endpoint
app.get('/debug', (req, res) => {
    console.log(`🔧 Debug endpoint called - Version: ${VERSION_ID}`);
    res.status(200).json({
        message: `Debug information - Version: ${VERSION_ID}`,
        timestamp: new Date().toISOString(),
        startupTime: STARTUP_TIME,
        version: VERSION_ID,
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
console.log('✅ Debug route registered');

// Catch all 404s
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl} - Version: ${VERSION_ID}`);
    res.status(404).json({
        error: 'Route not found',
        requestedRoute: `${req.method} ${req.originalUrl}`,
        version: VERSION_ID,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /health',
            'GET /',
            'GET /test',
            'GET /debug'
        ]
    });
});
console.log('✅ 404 handler registered');

// Error handler
app.use((err, req, res, next) => {
    console.error(`💥 Error - Version: ${VERSION_ID}:`, err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        version: VERSION_ID,
        timestamp: new Date().toISOString()
    });
});
console.log('✅ Error handler registered');

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmashLabs Backend (Fixed ${VERSION_ID}) running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕐 Started at: ${STARTUP_TIME}`);
    console.log('✅ All routes registered successfully!');
    console.log('📍 Available endpoints:');
    console.log(`   - GET /health`);
    console.log(`   - GET /`);
    console.log(`   - GET /test`);
    console.log(`   - GET /debug`);
    console.log(`🎯 Server ready to receive requests!`);
});

module.exports = app; 