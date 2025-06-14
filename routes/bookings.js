const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Booking = require('../models/Booking');
const emailService = require('../services/emailService');

// @route   GET /api/bookings
// @desc    Get all bookings (with pagination and filtering)
// @access  Public (admin should add auth middleware)
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Invalid status'),
    query('packageType').optional().isIn(['basic', 'premium', 'ultimate']).withMessage('Invalid package type'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format for dateFrom'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format for dateTo')
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
        if (req.query.packageType) filter.packageType = req.query.packageType;
        if (req.query.dateFrom || req.query.dateTo) {
            filter.preferredDate = {};
            if (req.query.dateFrom) filter.preferredDate.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) filter.preferredDate.$lte = new Date(req.query.dateTo);
        }

        const bookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-adminNotes'); // Hide admin notes from public API

        const total = await Booking.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                bookings,
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
        console.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Public
router.get('/:id', [
    param('id').isMongoId().withMessage('Invalid booking ID')
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

        const booking = await Booking.findById(req.params.id).select('-adminNotes');
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/bookings/booking-id/:bookingId
// @desc    Get booking by booking ID (public reference)
// @access  Public
router.get('/booking-id/:bookingId', [
    param('bookingId').notEmpty().withMessage('Booking ID is required')
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

        const booking = await Booking.findOne({
            bookingId: req.params.bookingId.toUpperCase()
        }).select('-adminNotes');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Public
router.post('/', [
    body('customerName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Customer name must be between 2 and 100 characters'),
    body('customerEmail')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('customerPhone')
        .matches(/^\+?[\d\s\-\(\)]{10,}$/)
        .withMessage('Please provide a valid phone number'),
    body('packageType')
        .isIn(['basic', 'premium', 'ultimate'])
        .withMessage('Package type must be one of: basic, premium, ultimate'),
    body('packageName')
        .trim()
        .notEmpty()
        .withMessage('Package name is required'),
    body('packagePrice')
        .isFloat({ min: 0 })
        .withMessage('Package price must be a positive number'),
    body('preferredDate')
        .isISO8601()
        .custom((value) => {
            const date = new Date(value);
            if (date <= new Date()) {
                throw new Error('Preferred date must be in the future');
            }
            return true;
        }),
    body('preferredTime')
        .isIn(['morning', 'afternoon', 'evening'])
        .withMessage('Preferred time must be one of: morning, afternoon, evening'),
    body('duration')
        .isInt({ min: 30, max: 240 })
        .withMessage('Duration must be between 30 and 240 minutes'),
    body('participants')
        .isInt({ min: 1, max: 10 })
        .withMessage('Participants must be between 1 and 10'),
    body('specialRequests')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Special requests cannot exceed 500 characters')
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

        // Create new booking
        const booking = new Booking(req.body);
        await booking.save();

        // Send confirmation email
        try {
            await emailService.sendBookingConfirmation(booking);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the booking if email fails
        }

        // Send admin notification
        try {
            await emailService.sendBookingNotification(booking);
        } catch (emailError) {
            console.error('Failed to send admin notification:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: {
                booking: booking.toObject(),
                bookingId: booking.bookingId
            }
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID already exists. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Admin (should add auth middleware)
router.put('/:id/status', [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('status')
        .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
        .withMessage('Status must be one of: pending, confirmed, cancelled, completed'),
    body('adminNotes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Admin notes cannot exceed 1000 characters')
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

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const oldStatus = booking.status;
        booking.status = req.body.status;
        
        if (req.body.adminNotes) {
            booking.adminNotes = req.body.adminNotes;
        }

        // Set appropriate timestamps
        if (req.body.status === 'confirmed' && oldStatus !== 'confirmed') {
            booking.confirmedAt = new Date();
        } else if (req.body.status === 'cancelled' && oldStatus !== 'cancelled') {
            booking.cancelledAt = new Date();
        } else if (req.body.status === 'completed' && oldStatus !== 'completed') {
            booking.completedAt = new Date();
        }

        await booking.save();

        // Send status update email to customer
        try {
            await emailService.sendBookingStatusUpdate(booking, oldStatus);
        } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
        }

        res.json({
            success: true,
            message: `Booking status updated to ${req.body.status}`,
            data: booking
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete booking (soft delete by setting status to cancelled)
// @access  Admin (should add auth middleware)
router.delete('/:id', [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason cannot exceed 500 characters')
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

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Soft delete by cancelling
        await booking.cancel(req.body.reason || 'Booking cancelled by admin');

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: booking
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/bookings/stats/overview
// @desc    Get booking statistics overview
// @access  Admin (should add auth middleware)
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Promise.all([
            Booking.countDocuments({ status: 'pending' }),
            Booking.countDocuments({ status: 'confirmed' }),
            Booking.countDocuments({ status: 'completed' }),
            Booking.countDocuments({ status: 'cancelled' }),
            Booking.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            })
        ]);

        const [pending, confirmed, completed, cancelled, lastMonth] = stats;
        const total = pending + confirmed + completed + cancelled;

        res.json({
            success: true,
            data: {
                total,
                pending,
                confirmed,
                completed,
                cancelled,
                lastMonth,
                conversionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Error fetching booking stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 