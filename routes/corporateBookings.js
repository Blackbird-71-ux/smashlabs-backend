const express = require('express');
const router = express.Router();
const CorporateBooking = require('../models/CorporateBooking');

// Validation middleware
const validateCorporateBooking = (req, res, next) => {
  const { 
    companyName, 
    contactPerson, 
    email, 
    phone, 
    jobTitle, 
    teamSize, 
    date, 
    time, 
    duration, 
    eventType 
  } = req.body;

  const errors = [];

  if (!companyName || companyName.trim().length === 0) {
    errors.push('Company name is required');
  }
  
  if (!contactPerson || contactPerson.trim().length === 0) {
    errors.push('Contact person is required');
  }
  
  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!phone || phone.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
    errors.push('Please enter a valid 10-digit phone number');
  }
  
  if (!jobTitle || jobTitle.trim().length === 0) {
    errors.push('Job title is required');
  }
  
  if (!teamSize) {
    errors.push('Team size is required');
  }
  
  if (!date) {
    errors.push('Preferred date is required');
  } else if (new Date(date) <= new Date()) {
    errors.push('Preferred date must be in the future');
  }
  
  if (!time) {
    errors.push('Preferred time is required');
  }
  
  if (!duration) {
    errors.push('Event duration is required');
  }
  
  if (!eventType) {
    errors.push('Event type is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  // Clean and format the phone number
  req.body.phone = phone.replace(/\D/g, '');
  req.body.preferredDate = new Date(date);
  req.body.preferredTime = time;

  next();
};

// @desc    Create a new corporate booking
// @route   POST /api/corporate-bookings
// @access  Public
router.post('/', validateCorporateBooking, async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      jobTitle,
      teamSize,
      preferredDate,
      preferredTime,
      duration,
      eventType,
      specialRequests
    } = req.body;

    // Check for duplicate booking (same company, email, and date)
    const existingBooking = await CorporateBooking.findOne({
      companyName: companyName.trim(),
      email: email.toLowerCase().trim(),
      preferredDate: preferredDate,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: 'A booking for this company and date already exists. Please choose a different date or contact us to modify the existing booking.',
        existingBooking: {
          bookingReference: existingBooking.bookingReference,
          status: existingBooking.status
        }
      });
    }

    // Create new corporate booking
    const corporateBooking = new CorporateBooking({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      phone: phone,
      jobTitle: jobTitle.trim(),
      teamSize,
      preferredDate,
      preferredTime,
      duration,
      eventType,
      specialRequests: specialRequests ? specialRequests.trim() : ''
    });

    const savedBooking = await corporateBooking.save();

    console.log(`New corporate booking created: ${savedBooking.bookingReference} for ${savedBooking.companyName}`);

    res.status(201).json({
      success: true,
      message: 'Corporate booking request submitted successfully',
      data: {
        bookingReference: savedBooking.bookingReference,
        companyName: savedBooking.companyName,
        contactPerson: savedBooking.contactPerson,
        email: savedBooking.email,
        eventType: savedBooking.eventType,
        teamSize: savedBooking.teamSize,
        preferredDate: savedBooking.formattedDate,
        status: savedBooking.status,
        id: savedBooking._id
      }
    });

  } catch (error) {
    console.error('Error creating corporate booking:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// @desc    Get all corporate bookings (admin only)
// @route   GET /api/corporate-bookings
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      company, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      startDate,
      endDate 
    } = req.query;

    const filter = {};
    
    // Status filter
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      filter.status = status;
    }
    
    // Company search
    if (company) {
      filter.companyName = { $regex: company, $options: 'i' };
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.preferredDate = {};
      if (startDate) filter.preferredDate.$gte = new Date(startDate);
      if (endDate) filter.preferredDate.$lte = new Date(endDate);
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await CorporateBooking.find(filter)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await CorporateBooking.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching corporate bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get corporate booking by ID
// @route   GET /api/corporate-bookings/:id
// @access  Admin
router.get('/:id', async (req, res) => {
  try {
    const booking = await CorporateBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Corporate booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Error fetching corporate booking:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Update corporate booking
// @route   PUT /api/corporate-bookings/:id
// @access  Admin
router.put('/:id', async (req, res) => {
  try {
    const { status, estimatedCost, actualCost, adminNotes } = req.body;
    
    const booking = await CorporateBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Corporate booking not found'
      });
    }

    // Update allowed fields
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      booking.status = status;
    }
    
    if (estimatedCost !== undefined) {
      booking.estimatedCost = parseFloat(estimatedCost);
    }
    
    if (actualCost !== undefined) {
      booking.actualCost = parseFloat(actualCost);
    }
    
    if (adminNotes !== undefined) {
      booking.adminNotes = adminNotes;
    }

    const updatedBooking = await booking.save();

    res.json({
      success: true,
      message: 'Corporate booking updated successfully',
      data: updatedBooking
    });

  } catch (error) {
    console.error('Error updating corporate booking:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Delete corporate booking
// @route   DELETE /api/corporate-bookings/:id
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const booking = await CorporateBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Corporate booking not found'
      });
    }

    await CorporateBooking.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Corporate booking deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting corporate booking:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get corporate booking statistics
// @route   GET /api/corporate-bookings/stats/overview
// @access  Admin
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await CorporateBooking.getStatistics();
    const upcomingBookings = await CorporateBooking.findUpcoming();
    const pendingBookings = await CorporateBooking.findPending();

    // Monthly booking trends (last 12 months)
    const monthlyStats = await CorporateBooking.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$actualCost', '$estimatedCost'] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          completedBookings: 0,
          totalRevenue: 0,
          averageTeamSize: 0
        },
        upcomingCount: upcomingBookings.length,
        pendingCount: pendingBookings.length,
        monthlyTrends: monthlyStats,
        recentBookings: pendingBookings.slice(0, 5) // Last 5 pending bookings
      }
    });

  } catch (error) {
    console.error('Error fetching corporate booking statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get booking by reference
// @route   GET /api/corporate-bookings/reference/:ref
// @access  Public (for customers to check their booking)
router.get('/reference/:ref', async (req, res) => {
  try {
    const booking = await CorporateBooking.findOne({ 
      bookingReference: req.params.ref.toUpperCase() 
    }).select('-adminNotes -__v');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found with this reference number'
      });
    }

    res.json({
      success: true,
      data: {
        bookingReference: booking.bookingReference,
        companyName: booking.companyName,
        contactPerson: booking.contactPerson,
        eventType: booking.eventType,
        teamSize: booking.teamSize,
        preferredDate: booking.formattedDate,
        preferredTime: booking.preferredTime,
        duration: booking.duration,
        status: booking.status,
        createdAt: booking.createdAt,
        isUpcoming: booking.isUpcoming
      }
    });

  } catch (error) {
    console.error('Error fetching booking by reference:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 