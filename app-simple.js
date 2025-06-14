require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

console.log('🔧 Starting SmashLabs Backend Server (Simple Version)...');
console.log('📊 Environment Variables Check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);
console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL ? 'Set' : 'Not Set'}`);

// Clean and validate FRONTEND_URL
const cleanFrontendUrl = () => {
    if (!process.env.FRONTEND_URL) {
        return '*';
    }
    
    // Remove any line breaks, spaces, or invalid characters
    const cleaned = process.env.FRONTEND_URL
        .toString()
        .trim()
        .replace(/[\r\n\t]/g, '') // Remove line breaks and tabs
        .replace(/\s+/g, ''); // Remove spaces
    
    // Validate URL format
    if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://'))) {
        console.log(`✅ Using cleaned FRONTEND_URL: ${cleaned}`);
        return cleaned;
    }
    
    console.log(`⚠️ Invalid FRONTEND_URL format, using wildcard: ${process.env.FRONTEND_URL}`);
    return '*';
};

const corsOrigin = cleanFrontendUrl();

// Basic middleware with fixed CORS
app.use(helmet());
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use('*', (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// ROUTES - Super simple, no external dependencies

// Health check endpoint (most important for Railway)
app.get('/health', (req, res) => {
    try {
        const response = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            message: 'SmashLabs Backend is running (simple version)',
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            corsOrigin: corsOrigin
        };
        
        console.log('Health check response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    try {
        const response = {
            message: 'SmashLabs Backend API (Simple Version)',
            status: 'Running',
            timestamp: new Date().toISOString(),
            availableEndpoints: ['/health', '/test', '/debug'],
            environment: process.env.NODE_ENV || 'development',
            corsOrigin: corsOrigin
        };
        
        console.log('Root endpoint response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Root endpoint error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    try {
        const response = {
            message: 'Test endpoint working!',
            env: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            corsOrigin: corsOrigin
        };
        
        console.log('Test endpoint response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// Debug endpoint
app.get('/debug', (req, res) => {
    try {
        const response = {
            message: 'Debug endpoint working!',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            availableRoutes: [
                'GET /',
                'GET /health', 
                'GET /test',
                'GET /debug'
            ],
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            environmentVariables: {
                NODE_ENV: process.env.NODE_ENV || 'development',
                PORT: process.env.PORT || 5000,
                FRONTEND_URL: process.env.FRONTEND_URL ? 'Set' : 'Not Set',
                corsOrigin: corsOrigin
            }
        };
        
        console.log('Debug endpoint response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableRoutes: ['GET /', 'GET /health', 'GET /test', 'GET /debug']
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        status: 'ERROR',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = () => {
    try {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SmashLabs Backend Server (Simple) running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 CORS Origin: ${corsOrigin}`);
            console.log(`🌐 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 Root: http://localhost:${PORT}/`);
            console.log(`🌐 Test: http://localhost:${PORT}/test`);
            console.log(`🌐 Debug: http://localhost:${PORT}/debug`);
            console.log('✅ Server is ready to accept connections!');
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app; 