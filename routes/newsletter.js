const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Newsletter = require('../models/Newsletter');
const emailService = require('../services/emailService');

// @route   GET /api/newsletter
// @desc    Get all newsletter subscribers (with pagination and filtering)
// @access  Admin (should add auth middleware)
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['active', 'unsubscribed', 'bounced', 'spam']).withMessage('Invalid status'),
    query('interest').optional().isIn(['packages', 'events', 'promotions', 'tips', 'news']).withMessage('Invalid interest')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.interest) filter.interests = req.query.interest;

        const subscribers = await Newsletter.find(filter)
            .sort({ subscriptionDate: -1 })
            .skip(skip)
            .limit(limit)
            .select('-campaignInteractions -bounces'); // Exclude detailed tracking data

        const total = await Newsletter.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                subscribers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/newsletter/:id
// @desc    Get subscriber by ID
// @access  Admin (should add auth middleware)
router.get('/:id', [
    param('id').isMongoId().withMessage('Invalid subscriber ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const subscriber = await Newsletter.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        res.json({
            success: true,
            data: subscriber
        });
    } catch (error) {
        console.error('Error fetching subscriber:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriber',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('interests')
        .optional()
        .isArray()
        .custom((interests) => {
            const validInterests = ['packages', 'events', 'promotions', 'tips', 'news'];
            return interests.every(interest => validInterests.includes(interest));
        })
        .withMessage('Invalid interests provided'),
    body('frequency')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'special'])
        .withMessage('Frequency must be one of: daily, weekly, monthly, special')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Check if already subscribed
        const existingSubscriber = await Newsletter.findOne({ email: req.body.email });
        if (existingSubscriber) {
            if (existingSubscriber.status === 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already subscribed to our newsletter'
                });
            } else {
                // Reactivate subscription
                await existingSubscriber.resubscribe();
                
                // Update preferences if provided
                if (req.body.interests) existingSubscriber.interests = req.body.interests;
                if (req.body.frequency) existingSubscriber.frequency = req.body.frequency;
                if (req.body.name) existingSubscriber.name = req.body.name;
                await existingSubscriber.save();

                return res.json({
                    success: true,
                    message: 'Welcome back! Your subscription has been reactivated.',
                    data: {
                        email: existingSubscriber.email,
                        status: existingSubscriber.status
                    }
                });
            }
        }

        // Create new subscription
        const subscriberData = {
            ...req.body,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            source: 'website'
        };

        const subscriber = new Newsletter(subscriberData);
        await subscriber.save();

        // Send welcome email
        try {
            await emailService.sendNewsletterWelcome(subscriber);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to our newsletter!',
            data: {
                email: subscriber.email,
                status: subscriber.status,
                interests: subscriber.interests
            }
        });
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email is already subscribed'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to subscribe to newsletter',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('reason')
        .optional()
        .isIn(['too_frequent', 'not_relevant', 'never_subscribed', 'technical_issues', 'other'])
        .withMessage('Invalid unsubscribe reason'),
    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Feedback cannot exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const subscriber = await Newsletter.findOne({ email: req.body.email });
        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list'
            });
        }

        if (subscriber.status === 'unsubscribed') {
            return res.json({
                success: true,
                message: 'Email is already unsubscribed'
            });
        }

        // Unsubscribe
        await subscriber.unsubscribe(
            req.body.reason || 'other',
            req.body.feedback
        );

        res.json({
            success: true,
            message: 'Successfully unsubscribed from our newsletter. We\'re sorry to see you go!'
        });
    } catch (error) {
        console.error('Error unsubscribing from newsletter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unsubscribe',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   PUT /api/newsletter/:id/preferences
// @desc    Update subscriber preferences
// @access  Public (should add token-based auth for security)
router.put('/:id/preferences', [
    param('id').isMongoId().withMessage('Invalid subscriber ID'),
    body('interests')
        .optional()
        .isArray()
        .custom((interests) => {
            const validInterests = ['packages', 'events', 'promotions', 'tips', 'news'];
            return interests.every(interest => validInterests.includes(interest));
        })
        .withMessage('Invalid interests provided'),
    body('frequency')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'special'])
        .withMessage('Frequency must be one of: daily, weekly, monthly, special'),
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const subscriber = await Newsletter.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        if (subscriber.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update preferences for inactive subscription'
            });
        }

        // Update preferences
        if (req.body.interests) subscriber.interests = req.body.interests;
        if (req.body.frequency) subscriber.frequency = req.body.frequency;
        if (req.body.name) subscriber.name = req.body.name;

        await subscriber.save();

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: {
                interests: subscriber.interests,
                frequency: subscriber.frequency,
                name: subscriber.name
            }
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/newsletter/stats/overview
// @desc    Get newsletter statistics overview
// @access  Admin (should add auth middleware)
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Promise.all([
            Newsletter.countDocuments({ status: 'active' }),
            Newsletter.countDocuments({ status: 'unsubscribed' }),
            Newsletter.countDocuments({ status: 'bounced' }),
            Newsletter.countDocuments({
                subscriptionDate: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            }),
            Newsletter.countDocuments({
                unsubscribedAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            })
        ]);

        const [active, unsubscribed, bounced, newSubscribersMonth, unsubscribedMonth] = stats;
        const total = active + unsubscribed + bounced;

        // Calculate engagement rates
        const engagementStats = await Newsletter.aggregate([
            {
                $match: {
                    status: 'active',
                    emailsSent: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    avgEngagementRate: {
                        $avg: {
                            $divide: ['$emailsOpened', '$emailsSent']
                        }
                    },
                    avgClickThroughRate: {
                        $avg: {
                            $cond: [
                                { $gt: ['$emailsOpened', 0] },
                                { $divide: ['$linksClicked', '$emailsOpened'] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const avgEngagementRate = engagementStats.length > 0 
            ? Math.round(engagementStats[0].avgEngagementRate * 100) 
            : 0;
        const avgClickThroughRate = engagementStats.length > 0 
            ? Math.round(engagementStats[0].avgClickThroughRate * 100) 
            : 0;

        res.json({
            success: true,
            data: {
                total,
                active,
                unsubscribed,
                bounced,
                newSubscribersMonth,
                unsubscribedMonth,
                growthRate: total > 0 ? Math.round(((newSubscribersMonth - unsubscribedMonth) / total) * 100) : 0,
                avgEngagementRate: `${avgEngagementRate}%`,
                avgClickThroughRate: `${avgClickThroughRate}%`
            }
        });
    } catch (error) {
        console.error('Error fetching newsletter stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch newsletter statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/newsletter/stats/interests
// @desc    Get subscriber interests breakdown
// @access  Admin (should add auth middleware)
router.get('/stats/interests', async (req, res) => {
    try {
        const interestStats = await Newsletter.aggregate([
            {
                $match: { status: 'active' }
            },
            {
                $unwind: '$interests'
            },
            {
                $group: {
                    _id: '$interests',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            data: interestStats
        });
    } catch (error) {
        console.error('Error fetching interest stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interest statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/newsletter/track/open/:campaignId
// @desc    Track email open
// @access  Public (called from email pixel)
router.post('/track/open/:campaignId', [
    param('campaignId').notEmpty().withMessage('Campaign ID is required'),
    body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const subscriber = await Newsletter.findOne({ email: req.body.email });
        if (subscriber) {
            await subscriber.recordEmailOpened(req.params.campaignId);
        }
        
        // Return 1x1 transparent pixel
        res.set('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
        console.error('Error tracking email open:', error);
        res.status(200).send(); // Don't fail email rendering
    }
});

// @route   POST /api/newsletter/track/click/:campaignId
// @desc    Track link click
// @access  Public (redirect from email links)
router.post('/track/click/:campaignId', [
    param('campaignId').notEmpty().withMessage('Campaign ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('url').isURL().withMessage('Valid URL is required')
], async (req, res) => {
    try {
        const subscriber = await Newsletter.findOne({ email: req.body.email });
        if (subscriber) {
            await subscriber.recordLinkClicked(req.params.campaignId, req.body.url);
        }
        
        // Redirect to the actual URL
        res.redirect(req.body.url);
    } catch (error) {
        console.error('Error tracking link click:', error);
        res.redirect(req.body.url || '/'); // Redirect anyway
    }
});

module.exports = router; 