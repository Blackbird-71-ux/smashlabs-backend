const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    // Contact Information
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
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
    },
    
    // Message Details
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        minlength: [5, 'Subject must be at least 5 characters long'],
        maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        minlength: [10, 'Message must be at least 10 characters long'],
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    
    // Inquiry Type
    inquiryType: {
        type: String,
        enum: {
            values: ['general', 'booking', 'support', 'partnership', 'feedback'],
            message: 'Inquiry type must be one of: general, booking, support, partnership, feedback'
        },
        default: 'general'
    },
    
    // Status and Response
    status: {
        type: String,
        enum: {
            values: ['new', 'in_progress', 'resolved', 'closed'],
            message: 'Status must be one of: new, in_progress, resolved, closed'
        },
        default: 'new'
    },
    
    // Admin Response
    adminResponse: {
        type: String,
        trim: true,
        maxlength: [2000, 'Admin response cannot exceed 2000 characters']
    },
    respondedAt: {
        type: Date
    },
    respondedBy: {
        type: String,
        trim: true
    },
    
    // Priority Level
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: 'Priority must be one of: low, medium, high, urgent'
        },
        default: 'medium'
    },
    
    // Additional Metadata
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    },
    source: {
        type: String,
        enum: ['website', 'phone', 'email', 'social_media', 'referral'],
        default: 'website'
    },
    
    // Internal Notes
    internalNotes: [{
        note: {
            type: String,
            required: true,
            trim: true,
            maxlength: [500, 'Note cannot exceed 500 characters']
        },
        addedBy: {
            type: String,
            required: true,
            trim: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Follow-up
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    },
    
    // Resolution
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted creation date
contactSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for response time in hours
contactSchema.virtual('responseTime').get(function() {
    if (!this.respondedAt) return null;
    
    const diffMs = this.respondedAt - this.createdAt;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return diffHours;
});

// Static method to find urgent contacts
contactSchema.statics.findUrgent = function() {
    return this.find({
        priority: { $in: ['high', 'urgent'] },
        status: { $in: ['new', 'in_progress'] }
    }).sort({ createdAt: -1 });
};

// Static method to find unresponded contacts
contactSchema.statics.findUnresponded = function() {
    return this.find({
        status: 'new',
        respondedAt: { $exists: false }
    }).sort({ createdAt: -1 });
};

// Instance method to add internal note
contactSchema.methods.addNote = function(note, addedBy) {
    this.internalNotes.push({ note, addedBy });
    return this.save();
};

// Instance method to mark as responded
contactSchema.methods.markResponded = function(response, respondedBy) {
    this.adminResponse = response;
    this.respondedAt = new Date();
    this.respondedBy = respondedBy;
    this.status = 'in_progress';
    return this.save();
};

// Instance method to resolve inquiry
contactSchema.methods.resolve = function() {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    return this.save();
};

// Pre-save middleware to handle priority escalation
contactSchema.pre('save', function(next) {
    // Auto-escalate priority for booking inquiries
    if (this.inquiryType === 'booking' && this.priority === 'low') {
        this.priority = 'medium';
    }
    
    // Auto-escalate if no response within 24 hours
    if (this.isNew && this.priority !== 'urgent') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (this.createdAt < oneDayAgo && !this.respondedAt) {
            this.priority = 'high';
        }
    }
    
    next();
});

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ respondedAt: 1 });

module.exports = mongoose.model('Contact', contactSchema); 