require('dotenv').config();
const express = require('express');

const app = express();
const VERSION = `railway-${Date.now()}`;

console.log(`🚂 Railway-specific version starting: ${VERSION}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${process.env.PORT || 5000}`);

// Process signal handling for Railway
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep server running
});

// Basic middleware
app.use(express.json());

// Manual CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log(`🔍 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Create explicit router
const router = express.Router();

// Health endpoint (Railway standard)
router.get('/health', (req, res) => {
    console.log('🏥 Health endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Railway Health Check',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000,
        uptime: process.uptime()
    });
});

// Root endpoint
router.get('/', (req, res) => {
    console.log('🏠 Root endpoint hit');
    res.status(200).json({
        message: 'SmashLabs API - Railway Version WORKING!',
        version: VERSION,
        timestamp: new Date().toISOString(),
        status: 'RUNNING',
        uptime: process.uptime(),
        endpoints: ['/', '/health', '/test', '/debug']
    });
});

// Test endpoint
router.get('/test', (req, res) => {
    console.log('🧪 Test endpoint hit');
    res.status(200).json({
        message: 'Test endpoint working on Railway!',
        version: VERSION,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime()
    });
});

// Debug endpoint
router.get('/debug', (req, res) => {
    console.log('🔧 Debug endpoint hit');
    res.status(200).json({
        message: 'Debug info',
        version: VERSION,
        timestamp: new Date().toISOString(),
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            pid: process.pid
        },
        routes: ['/', '/health', '/test', '/debug']
    });
});

// Apply router to app
app.use('/', router);

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: '404 - Not Found',
        path: req.originalUrl,
        method: req.method,
        version: VERSION,
        availableRoutes: ['/', '/health', '/test', '/debug']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('💥 Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        version: VERSION
    });
});

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚂 Railway Server running on port ${PORT}`);
    console.log(`📍 Version: ${VERSION}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('📋 Routes registered:');
    console.log('   GET /');
    console.log('   GET /health');
    console.log('   GET /test');
    console.log('   GET /debug');
    console.log('✅ Server ready!');
    
    // Keep-alive ping
    setInterval(() => {
        console.log(`💓 Server alive - uptime: ${process.uptime()}s`);
    }, 30000); // Every 30 seconds
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('🛑 Starting graceful shutdown...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
};

// Export for testing
module.exports = app; 