const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    // Personal Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
    },
    
    // Interests and Preferences
    interests: [{
        type: String,
        enum: [
            'Stress Relief',
            'Team Building', 
            'Corporate Events',
            'Birthday Parties',
            'Date Night',
            'Solo Session',
            'Group Therapy',
            'Anger Management'
        ]
    }],
    
    // How they heard about us
    hearAbout: {
        type: String,
        required: [true, 'Please tell us how you heard about us'],
        enum: [
            'Social Media',
            'Google Search', 
            'Friend/Family',
            'Advertisement',
            'Event/Exhibition',
            'Other'
        ]
    },
    
    // Additional message
    message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    
    // Registration Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'unsubscribed'],
        default: 'active'
    },
    
    // Registration Reference
    registrationId: {
        type: String,
        required: false,
        unique: true
    },
    
    // Source tracking
    source: {
        type: String,
        default: 'website'
    },
    
    // Admin Notes
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [500, 'Admin notes cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate registration ID before saving
registrationSchema.pre('save', function(next) {
    if (!this.registrationId) {
        const timestamp = Date.now().toString(36);
        const random1 = Math.random().toString(36).substr(2, 4);
        const random2 = Math.random().toString(36).substr(2, 4);
        this.registrationId = `REG-${timestamp}-${random1}${random2}`.toUpperCase();
    }
    next();
});

// Virtual for formatted registration date
registrationSchema.virtual('formattedDate').get(function() {
    if (!this.createdAt) return 'Date not set';
    return this.createdAt.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Static method to find active registrations
registrationSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Instance method to unsubscribe
registrationSchema.methods.unsubscribe = function() {
    this.status = 'unsubscribed';
    return this.save();
};

// Indexes for better query performance
registrationSchema.index({ email: 1, unique: true });
registrationSchema.index({ status: 1 });
registrationSchema.index({ interests: 1 });
registrationSchema.index({ hearAbout: 1 });
registrationSchema.index({ registrationId: 1, unique: true });
registrationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Registration', registrationSchema); 