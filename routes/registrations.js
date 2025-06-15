const express = require('express');
const { body, validationResult } = require('express-validator');
const Registration = require('../models/Registration');

const router = express.Router();

// @route   POST /api/registrations
// @desc    Create new community registration
// @access  Public
router.post('/', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit phone number'),
    body('interests')
        .isArray({ min: 1 })
        .withMessage('Please select at least one interest'),
    body('hearAbout')
        .notEmpty()
        .withMessage('Please tell us how you heard about us'),
    body('message')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Message cannot exceed 1000 characters')
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

        // Check if email already exists
        const existingRegistration = await Registration.findOne({ 
            email: req.body.email.toLowerCase() 
        });
        
        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered. Please use a different email address.'
            });
        }

        // Create new registration
        const registration = new Registration(req.body);
        await registration.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to the SmashLabs community!',
            data: {
                registration: registration.toObject(),
                registrationId: registration.registrationId
            }
        });
    } catch (error) {
        console.error('Error creating registration:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered. Please use a different email address.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create registration',
            error: error.message
        });
    }
});

// @route   GET /api/registrations
// @desc    Get all registrations (Admin only - should add auth middleware)
// @access  Admin
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.interest) {
            filter.interests = { $in: [req.query.interest] };
        }
        if (req.query.hearAbout) {
            filter.hearAbout = req.query.hearAbout;
        }

        const registrations = await Registration.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Registration.countDocuments(filter);

        res.json({
            success: true,
            data: {
                registrations,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registrations',
            error: error.message
        });
    }
});

// @route   GET /api/registrations/:id
// @desc    Get registration by ID
// @access  Admin
router.get('/:id', async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        res.json({
            success: true,
            data: registration
        });
    } catch (error) {
        console.error('Error fetching registration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registration',
            error: error.message
        });
    }
});

// @route   PUT /api/registrations/:id/status
// @desc    Update registration status
// @access  Admin
router.put('/:id/status', [
    body('status')
        .isIn(['active', 'inactive', 'unsubscribed'])
        .withMessage('Status must be one of: active, inactive, unsubscribed')
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

        const registration = await Registration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        registration.status = req.body.status;
        if (req.body.status === 'unsubscribed') {
            registration.emailNotifications = false;
            registration.smsNotifications = false;
        }
        
        await registration.save();

        res.json({
            success: true,
            message: `Registration status updated to ${req.body.status}`,
            data: registration
        });
    } catch (error) {
        console.error('Error updating registration status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update registration status',
            error: error.message
        });
    }
});

// @route   GET /api/registrations/stats/overview
// @desc    Get registration statistics
// @access  Admin
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Promise.all([
            Registration.countDocuments({ status: 'active' }),
            Registration.countDocuments({ status: 'inactive' }),
            Registration.countDocuments({ status: 'unsubscribed' }),
            Registration.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            })
        ]);

        const [active, inactive, unsubscribed, lastMonth] = stats;
        const total = active + inactive + unsubscribed;

        // Get interest distribution
        const interestStats = await Registration.aggregate([
            { $unwind: '$interests' },
            { $group: { _id: '$interests', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                total,
                active,
                inactive,
                unsubscribed,
                lastMonth,
                interestDistribution: interestStats
            }
        });
    } catch (error) {
        console.error('Error fetching registration stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registration statistics',
            error: error.message
        });
    }
});

module.exports = router; 