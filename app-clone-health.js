require('dotenv').config();
const express = require('express');

const app = express();
const VERSION = `clone-health-${Date.now()}`;

console.log(`🔬 Clone Health Version: ${VERSION}`);

// Basic middleware - exactly like health endpoint
app.use(express.json());

// CORS - minimal
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Logging
app.use((req, res, next) => {
    console.log(`REQUEST: ${req.method} ${req.path}`);
    next();
});

// Health endpoint (the one that works) - UNCHANGED
app.get('/health', (req, res) => {
    console.log('Health endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Railway Health Check',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

// Root endpoint - EXACTLY like health
app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Root endpoint working - Clone of Health',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

// Test endpoint - EXACTLY like health
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Test endpoint working - Clone of Health',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

// Debug endpoint - EXACTLY like health
app.get('/debug', (req, res) => {
    console.log('Debug endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Debug endpoint working - Clone of Health',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

// API endpoint - EXACTLY like health
app.get('/api', (req, res) => {
    console.log('API endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'API endpoint working - Clone of Health',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

// Working endpoint - EXACTLY like health
app.get('/working', (req, res) => {
    console.log('Working endpoint hit');
    res.status(200).json({
        status: 'OK',
        message: 'Working endpoint - Clone of Health',
        version: VERSION,
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔬 Clone Health Server running on port ${PORT}`);
    console.log(`Version: ${VERSION}`);
    console.log('Routes registered:');
    console.log('  GET /health (original working)');
    console.log('  GET / (clone of health)');
    console.log('  GET /test (clone of health)');
    console.log('  GET /debug (clone of health)');
    console.log('  GET /api (clone of health)');
    console.log('  GET /working (clone of health)');
    console.log('Server ready!');
});

module.exports = app; 