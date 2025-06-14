const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Admin (should add auth middleware)
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // Parallel queries for better performance
        const [
            // Bookings
            totalBookings,
            todayBookings,
            weekBookings,
            monthBookings,
            pendingBookings,
            confirmedBookings,
            
            // Contacts
            totalContacts,
            todayContacts,
            urgentContacts,
            unrespondedContacts,
            
            // Newsletter
            totalSubscribers,
            activeSubscribers,
            newSubscribersWeek,
            
            // Revenue (assuming all confirmed bookings are paid)
            monthlyRevenue,
            yearlyRevenue
        ] = await Promise.all([
            // Bookings
            Booking.countDocuments(),
            Booking.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
            Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
            Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Booking.countDocuments({ status: 'pending' }),
            Booking.countDocuments({ status: 'confirmed' }),
            
            // Contacts
            Contact.countDocuments(),
            Contact.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
            Contact.countDocuments({ priority: { $in: ['high', 'urgent'] }, status: { $in: ['new', 'in_progress'] } }),
            Contact.countDocuments({ status: 'new', respondedAt: { $exists: false } }),
            
            // Newsletter
            Newsletter.countDocuments(),
            Newsletter.countDocuments({ status: 'active' }),
            Newsletter.countDocuments({ status: 'active', subscriptionDate: { $gte: startOfWeek } }),
            
            // Revenue calculations
            Booking.aggregate([
                {
                    $match: {
                        status: 'confirmed',
                        createdAt: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$packagePrice' }
                    }
                }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        status: 'confirmed',
                        createdAt: { $gte: startOfYear }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$packagePrice' }
                    }
                }
            ])
        ]);

        // Recent activities
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('customerName packageName status createdAt bookingId');

        const recentContacts = await Contact.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name subject status priority createdAt');

        // Calculate growth rates
        const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonthStart = new Date(startOfMonth.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [lastWeekBookings, lastMonthBookings] = await Promise.all([
            Booking.countDocuments({ 
                createdAt: { $gte: lastWeekStart, $lt: startOfWeek } 
            }),
            Booking.countDocuments({ 
                createdAt: { $gte: lastMonthStart, $lt: startOfMonth } 
            })
        ]);

        const weeklyGrowth = lastWeekBookings > 0 
            ? Math.round(((weekBookings - lastWeekBookings) / lastWeekBookings) * 100)
            : weekBookings > 0 ? 100 : 0;

        const monthlyGrowth = lastMonthBookings > 0 
            ? Math.round(((monthBookings - lastMonthBookings) / lastMonthBookings) * 100)
            : monthBookings > 0 ? 100 : 0;

        res.json({
            success: true,
            data: {
                overview: {
                    bookings: {
                        total: totalBookings,
                        today: todayBookings,
                        thisWeek: weekBookings,
                        thisMonth: monthBookings,
                        pending: pendingBookings,
                        confirmed: confirmedBookings,
                        weeklyGrowth: `${weeklyGrowth}%`,
                        monthlyGrowth: `${monthlyGrowth}%`
                    },
                    contacts: {
                        total: totalContacts,
                        today: todayContacts,
                        urgent: urgentContacts,
                        unresponded: unrespondedContacts
                    },
                    newsletter: {
                        total: totalSubscribers,
                        active: activeSubscribers,
                        newThisWeek: newSubscribersWeek,
                        engagementRate: activeSubscribers > 0 
                            ? Math.round((activeSubscribers / totalSubscribers) * 100) 
                            : 0
                    },
                    revenue: {
                        thisMonth: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
                        thisYear: yearlyRevenue.length > 0 ? yearlyRevenue[0].total : 0,
                        currency: 'INR'
                    }
                },
                recentActivity: {
                    bookings: recentBookings,
                    contacts: recentContacts
                },
                alerts: [
                    ...(urgentContacts > 0 ? [`${urgentContacts} urgent contact(s) need attention`] : []),
                    ...(unrespondedContacts > 0 ? [`${unrespondedContacts} unresponded contact(s)`] : []),
                    ...(pendingBookings > 5 ? [`${pendingBookings} pending bookings need review`] : [])
                ],
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/admin/analytics/bookings
// @desc    Get booking analytics
// @access  Admin (should add auth middleware)
router.get('/analytics/bookings', [
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
    query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy')
], async (req, res) => {
    try {
        const period = req.query.period || 'month';
        const groupBy = req.query.groupBy || 'day';

        // Calculate date ranges
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Bookings over time
        const bookingTrends = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: groupBy === 'day' ? '%Y-%m-%d' : 
                                   groupBy === 'week' ? '%Y-%U' : '%Y-%m',
                            date: '$createdAt'
                        }
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$packagePrice' },
                    confirmed: {
                        $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Package popularity
        const packageStats = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$packageType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$packagePrice' },
                    avgPrice: { $avg: '$packagePrice' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Status distribution
        const statusStats = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Peak hours analysis
        const hourlyStats = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: now.toISOString()
                },
                trends: bookingTrends,
                packagePopularity: packageStats,
                statusDistribution: statusStats,
                peakHours: hourlyStats,
                summary: {
                    totalBookings: bookingTrends.reduce((sum, item) => sum + item.count, 0),
                    totalRevenue: bookingTrends.reduce((sum, item) => sum + item.revenue, 0),
                    conversionRate: bookingTrends.length > 0 
                        ? Math.round((bookingTrends.reduce((sum, item) => sum + item.confirmed, 0) / 
                          bookingTrends.reduce((sum, item) => sum + item.count, 0)) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching booking analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/admin/analytics/contacts
// @desc    Get contact analytics
// @access  Admin (should add auth middleware)
router.get('/analytics/contacts', [
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period')
], async (req, res) => {
    try {
        const period = req.query.period || 'month';
        
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const [inquiryTypes, priorities, responseStats, dailyTrends] = await Promise.all([
            // Inquiry type distribution
            Contact.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: '$inquiryType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Priority distribution
            Contact.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: '$priority', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Response time statistics
            Contact.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        respondedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        responseTime: {
                            $divide: [
                                { $subtract: ['$respondedAt', '$createdAt'] },
                                1000 * 60 * 60 // Convert to hours
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgResponseTime: { $avg: '$responseTime' },
                        minResponseTime: { $min: '$responseTime' },
                        maxResponseTime: { $max: '$responseTime' },
                        totalResponded: { $sum: 1 }
                    }
                }
            ]),

            // Daily contact trends
            Contact.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        },
                        count: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: now.toISOString()
                },
                inquiryTypes,
                priorities,
                responseStats: responseStats[0] || {
                    avgResponseTime: 0,
                    minResponseTime: 0,
                    maxResponseTime: 0,
                    totalResponded: 0
                },
                dailyTrends,
                summary: {
                    totalContacts: dailyTrends.reduce((sum, item) => sum + item.count, 0),
                    totalResolved: dailyTrends.reduce((sum, item) => sum + item.resolved, 0),
                    resolutionRate: dailyTrends.length > 0 
                        ? Math.round((dailyTrends.reduce((sum, item) => sum + item.resolved, 0) / 
                          dailyTrends.reduce((sum, item) => sum + item.count, 0)) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching contact analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/admin/system/health
// @desc    Get system health status
// @access  Admin (should add auth middleware)
router.get('/system/health', async (req, res) => {
    try {
        const dbStatus = await checkDatabaseHealth();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: {
                    seconds: Math.floor(uptime),
                    formatted: formatUptime(uptime)
                },
                database: dbStatus,
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024),
                    unit: 'MB'
                },
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            }
        });
    } catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
            success: false,
            message: 'System health check failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper function to check database health
async function checkDatabaseHealth() {
    try {
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        
        return {
            status: states[dbState] || 'unknown',
            connected: dbState === 1,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    } catch (error) {
        return {
            status: 'error',
            connected: false,
            error: error.message
        };
    }
}

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

module.exports = router; 