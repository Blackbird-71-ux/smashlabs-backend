const mongoose = require('mongoose');

const corporateBookingSchema = new mongoose.Schema({
  // Company Information
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    index: true
  },
  
  // Contact Person Details
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true,
    maxlength: [50, 'Contact person name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    index: true
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [50, 'Job title cannot exceed 50 characters']
  },
  
  // Event Details
  teamSize: {
    type: String,
    required: [true, 'Team size is required'],
    enum: {
      values: ['5-10 people', '11-20 people', '21-30 people', '31-50 people', '50+ people'],
      message: 'Please select a valid team size range'
    }
  },
  
  preferredDate: {
    type: Date,
    required: [true, 'Preferred date is required'],
    validate: {
      validator: function(date) {
        return date >= new Date();
      },
      message: 'Preferred date must be in the future'
    }
  },
  
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required'],
    enum: {
      values: ['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 5 PM)', 'Evening (5 PM - 8 PM)'],
      message: 'Please select a valid time slot'
    }
  },
  
  duration: {
    type: String,
    required: [true, 'Event duration is required'],
    enum: {
      values: ['1 hour', '2 hours', '3 hours', '4 hours', 'Half day', 'Full day'],
      message: 'Please select a valid duration'
    }
  },
  
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: {
      values: [
        'Team Building',
        'Stress Relief Session', 
        'Company Celebration',
        'Product Launch Event',
        'Employee Appreciation',
        'Team Retreat',
        'Holiday Party',
        'Custom Event'
      ],
      message: 'Please select a valid event type'
    }
  },
  
  specialRequests: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    default: ''
  },
  
  // Booking Status and Management
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled', 'completed'],
      message: 'Status must be pending, confirmed, cancelled, or completed'
    },
    default: 'pending',
    index: true
  },
  
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0
  },
  
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative']
  },
  
  // Internal Notes
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  
  // Tracking
  bookingReference: {
    type: String,
    unique: true,
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  confirmedAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  }
}, {
  timestamps: true, // This will override createdAt and updatedAt
  collection: 'corporatebookings'
});

// Indexes for performance
corporateBookingSchema.index({ companyName: 1, email: 1 });
corporateBookingSchema.index({ preferredDate: 1, status: 1 });
corporateBookingSchema.index({ createdAt: -1 });
corporateBookingSchema.index({ status: 1, preferredDate: 1 });

// Virtual fields
corporateBookingSchema.virtual('isUpcoming').get(function() {
  return this.preferredDate > new Date() && this.status !== 'cancelled';
});

corporateBookingSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

corporateBookingSchema.virtual('formattedDate').get(function() {
  return this.preferredDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

corporateBookingSchema.virtual('teamSizeNumber').get(function() {
  const sizeMap = {
    '5-10 people': 7.5,
    '11-20 people': 15.5,
    '21-30 people': 25.5,
    '31-50 people': 40.5,
    '50+ people': 60
  };
  return sizeMap[this.teamSize] || 0;
});

// Pre-save middleware
corporateBookingSchema.pre('save', function(next) {
  // Generate booking reference if not exists
  if (!this.bookingReference) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.bookingReference = `CORP-${datePart}-${randomPart}`;
  }
  
  // Update timestamps
  this.updatedAt = new Date();
  
  // Set confirmation timestamp
  if (this.isModified('status') && this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  
  // Set completion timestamp
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Instance methods
corporateBookingSchema.methods.confirm = function() {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

corporateBookingSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  if (reason) {
    this.adminNotes = (this.adminNotes || '') + `\nCancelled: ${reason}`;
  }
  return this.save();
};

corporateBookingSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

corporateBookingSchema.methods.updateCost = function(cost, isActual = false) {
  if (isActual) {
    this.actualCost = cost;
  } else {
    this.estimatedCost = cost;
  }
  return this.save();
};

// Static methods
corporateBookingSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

corporateBookingSchema.statics.findUpcoming = function() {
  return this.find({
    preferredDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] }
  }).sort({ preferredDate: 1 });
};

corporateBookingSchema.statics.findByCompany = function(companyName) {
  return this.find({ 
    companyName: new RegExp(companyName, 'i') 
  }).sort({ createdAt: -1 });
};

corporateBookingSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        pendingBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $ifNull: ['$actualCost', '$estimatedCost'] }
        },
        averageTeamSize: { $avg: '$teamSizeNumber' }
      }
    }
  ]);
};

// Ensure virtual fields are serialized
corporateBookingSchema.set('toJSON', { virtuals: true });
corporateBookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CorporateBooking', corporateBookingSchema); 