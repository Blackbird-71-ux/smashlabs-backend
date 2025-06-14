require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

console.log('🔧 Starting SmashLabs Backend Server (Minimal Version)...');
console.log('📊 Environment Variables Check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not Set'}`);

// Basic middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use('*', (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

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

// ROUTES - Define all routes explicitly

// Health check endpoint (most important for Railway)
app.get('/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        
        const response = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            message: 'SmashLabs Backend is running (minimal version)',
            database: dbStatus,
            environment: process.env.NODE_ENV || 'development'
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
            message: 'SmashLabs Backend API (Minimal Version)',
            status: 'Running',
            timestamp: new Date().toISOString(),
            database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            availableEndpoints: ['/health', '/test', '/debug']
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
            env: process.env.NODE_ENV,
            mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
            mongoStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            port: process.env.PORT,
            timestamp: new Date().toISOString()
        };
        
        console.log('Test endpoint response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// Debug endpoint to show all routes and system info
app.get('/debug', (req, res) => {
    try {
        const response = {
            message: 'Debug endpoint working!',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 5000,
            mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
            mongoStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
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
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
                FRONTEND_URL: process.env.FRONTEND_URL || 'Not Set'
            }
        };
        
        console.log('Debug endpoint response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// 404 handler - must be after all routes
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

// Start server and connect to database
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Start server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SmashLabs Backend Server (Minimal) running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
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