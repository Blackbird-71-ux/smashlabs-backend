const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Contact = require('../models/Contact');
const emailService = require('../services/emailService');

// @route   GET /api/contact
// @desc    Get all contact messages (with pagination and filtering)
// @access  Admin (should add auth middleware)
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['new', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    query('inquiryType').optional().isIn(['general', 'booking', 'support', 'partnership', 'feedback']).withMessage('Invalid inquiry type'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
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
        if (req.query.inquiryType) filter.inquiryType = req.query.inquiryType;
        if (req.query.priority) filter.priority = req.query.priority;

        const contacts = await Contact.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Contact.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                contacts,
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
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact/:id
// @desc    Get contact by ID
// @access  Admin (should add auth middleware)
router.get('/:id', [
    param('id').isMongoId().withMessage('Invalid contact ID')
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

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/contact
// @desc    Create new contact message
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
        .optional()
        .matches(/^\+?[\d\s\-\(\)]{10,}$/)
        .withMessage('Please provide a valid phone number'),
    body('subject')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Subject must be between 5 and 200 characters'),
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters'),
    body('inquiryType')
        .optional()
        .isIn(['general', 'booking', 'support', 'partnership', 'feedback'])
        .withMessage('Invalid inquiry type')
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

        // Capture additional metadata
        const contactData = {
            ...req.body,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            source: 'website'
        };

        // Create new contact
        const contact = new Contact(contactData);
        await contact.save();

        // Send acknowledgment email to user
        try {
            await emailService.sendContactAcknowledgment(contact);
        } catch (emailError) {
            console.error('Failed to send acknowledgment email:', emailError);
        }

        // Send notification to admin
        try {
            await emailService.sendContactNotification(contact);
        } catch (emailError) {
            console.error('Failed to send admin notification:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon!',
            data: {
                id: contact._id,
                status: contact.status,
                createdAt: contact.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   PUT /api/contact/:id/status
// @desc    Update contact status
// @access  Admin (should add auth middleware)
router.put('/:id/status', [
    param('id').isMongoId().withMessage('Invalid contact ID'),
    body('status')
        .isIn(['new', 'in_progress', 'resolved', 'closed'])
        .withMessage('Status must be one of: new, in_progress, resolved, closed'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Priority must be one of: low, medium, high, urgent')
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

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.status = req.body.status;
        if (req.body.priority) {
            contact.priority = req.body.priority;
        }

        if (req.body.status === 'resolved') {
            contact.resolvedAt = new Date();
        }

        await contact.save();

        res.json({
            success: true,
            message: `Contact status updated to ${req.body.status}`,
            data: contact
        });
    } catch (error) {
        console.error('Error updating contact status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contact status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/contact/:id/respond
// @desc    Respond to contact message
// @access  Admin (should add auth middleware)
router.post('/:id/respond', [
    param('id').isMongoId().withMessage('Invalid contact ID'),
    body('response')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Response must be between 10 and 2000 characters'),
    body('respondedBy')
        .trim()
        .notEmpty()
        .withMessage('Responded by field is required')
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

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Mark as responded
        await contact.markResponded(req.body.response, req.body.respondedBy);

        // Send response email to customer
        try {
            await emailService.sendContactResponse(contact, req.body.response);
        } catch (emailError) {
            console.error('Failed to send response email:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Response saved but failed to send email notification'
            });
        }

        res.json({
            success: true,
            message: 'Response sent successfully',
            data: contact
        });
    } catch (error) {
        console.error('Error responding to contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send response',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/contact/:id/notes
// @desc    Add internal note to contact
// @access  Admin (should add auth middleware)
router.post('/:id/notes', [
    param('id').isMongoId().withMessage('Invalid contact ID'),
    body('note')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Note must be between 1 and 500 characters'),
    body('addedBy')
        .trim()
        .notEmpty()
        .withMessage('Added by field is required')
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

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        await contact.addNote(req.body.note, req.body.addedBy);

        res.json({
            success: true,
            message: 'Note added successfully',
            data: contact
        });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact/stats/urgent
// @desc    Get urgent contacts
// @access  Admin (should add auth middleware)
router.get('/stats/urgent', async (req, res) => {
    try {
        const urgentContacts = await Contact.findUrgent().limit(10);
        const urgentCount = await Contact.countDocuments({
            priority: { $in: ['high', 'urgent'] },
            status: { $in: ['new', 'in_progress'] }
        });

        res.json({
            success: true,
            data: {
                count: urgentCount,
                contacts: urgentContacts
            }
        });
    } catch (error) {
        console.error('Error fetching urgent contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch urgent contacts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/contact/stats/overview
// @desc    Get contact statistics overview
// @access  Admin (should add auth middleware)
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Promise.all([
            Contact.countDocuments({ status: 'new' }),
            Contact.countDocuments({ status: 'in_progress' }),
            Contact.countDocuments({ status: 'resolved' }),
            Contact.countDocuments({ status: 'closed' }),
            Contact.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
            }),
            Contact.countDocuments({
                respondedAt: { $exists: false },
                status: 'new'
            })
        ]);

        const [newContacts, inProgress, resolved, closed, lastWeek, unresponded] = stats;
        const total = newContacts + inProgress + resolved + closed;

        // Calculate average response time
        const responseTimes = await Contact.aggregate([
            {
                $match: {
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
                    avgResponseTime: { $avg: '$responseTime' }
                }
            }
        ]);

        const avgResponseTime = responseTimes.length > 0 
            ? Math.round(responseTimes[0].avgResponseTime) 
            : 0;

        res.json({
            success: true,
            data: {
                total,
                new: newContacts,
                inProgress,
                resolved,
                closed,
                lastWeek,
                unresponded,
                avgResponseTime: `${avgResponseTime} hours`
            }
        });
    } catch (error) {
        console.error('Error fetching contact stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 