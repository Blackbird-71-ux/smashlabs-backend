const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // Customer Information
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    customerEmail: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    customerPhone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
    },
    
    // Booking Details
    packageType: {
        type: String,
        required: [true, 'Package type is required'],
        enum: {
            values: ['basic', 'premium', 'ultimate'],
            message: 'Package type must be one of: basic, premium, ultimate'
        }
    },
    packageName: {
        type: String,
        required: [true, 'Package name is required']
    },
    packagePrice: {
        type: Number,
        required: [true, 'Package price is required'],
        min: [0, 'Price cannot be negative']
    },
    
    // Session Details
    preferredDate: {
        type: Date,
        required: [true, 'Preferred date is required'],
        validate: {
            validator: function(date) {
                return date > new Date();
            },
            message: 'Preferred date must be in the future'
        }
    },
    preferredTime: {
        type: String,
        required: [true, 'Preferred time is required'],
        enum: {
            values: ['morning', 'afternoon', 'evening'],
            message: 'Preferred time must be one of: morning, afternoon, evening'
        }
    },
    duration: {
        type: Number,
        required: [true, 'Session duration is required'],
        min: [30, 'Duration cannot be less than 30 minutes'],
        max: [240, 'Duration cannot exceed 240 minutes']
    },
    
    // Additional Information
    participants: {
        type: Number,
        required: [true, 'Number of participants is required'],
        min: [1, 'At least 1 participant is required'],
        max: [10, 'Maximum 10 participants allowed']
    },
    specialRequests: {
        type: String,
        trim: true,
        maxlength: [500, 'Special requests cannot exceed 500 characters']
    },
    
    // Booking Status
    status: {
        type: String,
        enum: {
            values: ['pending', 'confirmed', 'cancelled', 'completed'],
            message: 'Status must be one of: pending, confirmed, cancelled, completed'
        },
        default: 'pending'
    },
    
    // Payment Information
    paymentStatus: {
        type: String,
        enum: {
            values: ['pending', 'partial', 'paid', 'refunded'],
            message: 'Payment status must be one of: pending, partial, paid, refunded'
        },
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer'],
        required: false
    },
    
    // Booking Reference
    bookingId: {
        type: String,
        required: false,
        unique: true
    },
    
    // Internal Notes
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    
    // Timestamps
    confirmedAt: Date,
    cancelledAt: Date,
    completedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate booking ID before saving
bookingSchema.pre('save', function(next) {
    if (!this.bookingId) {
        const timestamp = Date.now().toString(36);
        const random1 = Math.random().toString(36).substr(2, 4);
        const random2 = Math.random().toString(36).substr(2, 4);
        this.bookingId = `SL-${timestamp}-${random1}${random2}`.toUpperCase();
    }
    next();
});

// Virtual for formatted booking date
bookingSchema.virtual('formattedDate').get(function() {
    if (!this.preferredDate) return 'Date not set';
    return this.preferredDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Static method to find bookings by date range
bookingSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        preferredDate: {
            $gte: startDate,
            $lte: endDate
        }
    });
};

// Instance method to confirm booking
bookingSchema.methods.confirm = function() {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    return this.save();
};

// Instance method to cancel booking
bookingSchema.methods.cancel = function(reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) {
        this.adminNotes = (this.adminNotes || '') + `\nCancelled: ${reason}`;
    }
    return this.save();
};

// Indexes for better query performance
bookingSchema.index({ customerEmail: 1 });
bookingSchema.index({ preferredDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingId: 1, unique: true });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema); 