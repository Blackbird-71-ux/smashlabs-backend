const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    // Subscriber Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        index: true
    },
    name: {
        type: String,
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    // Subscription Status
    status: {
        type: String,
        enum: {
            values: ['active', 'unsubscribed', 'bounced', 'spam'],
            message: 'Status must be one of: active, unsubscribed, bounced, spam'
        },
        default: 'active'
    },
    
    // Subscription Preferences
    interests: [{
        type: String,
        enum: ['packages', 'events', 'promotions', 'tips', 'news'],
        default: ['packages', 'promotions']
    }],
    frequency: {
        type: String,
        enum: {
            values: ['daily', 'weekly', 'monthly', 'special'],
            message: 'Frequency must be one of: daily, weekly, monthly, special'
        },
        default: 'weekly'
    },
    
    // Source and Attribution
    source: {
        type: String,
        enum: ['website', 'social_media', 'referral', 'event', 'manual'],
        default: 'website'
    },
    referralSource: {
        type: String,
        trim: true,
        maxlength: [200, 'Referral source cannot exceed 200 characters']
    },
    
    // Engagement Tracking
    subscriptionDate: {
        type: Date,
        default: Date.now
    },
    lastEmailSent: {
        type: Date
    },
    lastEmailOpened: {
        type: Date
    },
    lastLinkClicked: {
        type: Date
    },
    
    // Statistics
    emailsSent: {
        type: Number,
        default: 0,
        min: 0
    },
    emailsOpened: {
        type: Number,
        default: 0,
        min: 0
    },
    linksClicked: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Unsubscription Details
    unsubscribedAt: {
        type: Date
    },
    unsubscribeReason: {
        type: String,
        enum: ['too_frequent', 'not_relevant', 'never_subscribed', 'technical_issues', 'other'],
        required: function() {
            return this.status === 'unsubscribed';
        }
    },
    unsubscribeFeedback: {
        type: String,
        trim: true,
        maxlength: [500, 'Feedback cannot exceed 500 characters']
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
    location: {
        country: String,
        city: String,
        region: String
    },
    
    // Campaign Interactions
    campaignInteractions: [{
        campaignId: {
            type: String,
            required: true
        },
        campaignName: {
            type: String,
            required: true
        },
        sentAt: {
            type: Date,
            required: true
        },
        openedAt: Date,
        clickedAt: Date,
        links: [{
            url: String,
            clickedAt: Date
        }]
    }],
    
    // Bounces and Issues
    bounces: [{
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['hard', 'soft'],
            required: true
        },
        reason: {
            type: String,
            required: true
        }
    }],
    
    // Tags for Segmentation
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Custom Fields
    customFields: {
        type: Map,
        of: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for engagement rate
newsletterSchema.virtual('engagementRate').get(function() {
    if (this.emailsSent === 0) return 0;
    return Math.round((this.emailsOpened / this.emailsSent) * 100);
});

// Virtual for click-through rate
newsletterSchema.virtual('clickThroughRate').get(function() {
    if (this.emailsOpened === 0) return 0;
    return Math.round((this.linksClicked / this.emailsOpened) * 100);
});

// Virtual for subscription duration in days
newsletterSchema.virtual('subscriptionDuration').get(function() {
    const endDate = this.unsubscribedAt || new Date();
    const diffMs = endDate - this.subscriptionDate;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// Static method to find active subscribers
newsletterSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Static method to find subscribers by interest
newsletterSchema.statics.findByInterest = function(interest) {
    return this.find({
        status: 'active',
        interests: interest
    });
};

// Static method to find engaged subscribers
newsletterSchema.statics.findEngaged = function() {
    return this.find({
        status: 'active',
        emailsOpened: { $gt: 0 },
        $expr: { $gt: [{ $divide: ['$emailsOpened', '$emailsSent'] }, 0.1] }
    });
};

// Instance method to record email sent
newsletterSchema.methods.recordEmailSent = function(campaignId, campaignName) {
    this.emailsSent += 1;
    this.lastEmailSent = new Date();
    
    this.campaignInteractions.push({
        campaignId,
        campaignName,
        sentAt: new Date()
    });
    
    return this.save();
};

// Instance method to record email opened
newsletterSchema.methods.recordEmailOpened = function(campaignId) {
    this.emailsOpened += 1;
    this.lastEmailOpened = new Date();
    
    const interaction = this.campaignInteractions.find(
        i => i.campaignId === campaignId
    );
    if (interaction && !interaction.openedAt) {
        interaction.openedAt = new Date();
    }
    
    return this.save();
};

// Instance method to record link clicked
newsletterSchema.methods.recordLinkClicked = function(campaignId, url) {
    this.linksClicked += 1;
    this.lastLinkClicked = new Date();
    
    const interaction = this.campaignInteractions.find(
        i => i.campaignId === campaignId
    );
    if (interaction) {
        if (!interaction.clickedAt) {
            interaction.clickedAt = new Date();
        }
        interaction.links.push({
            url,
            clickedAt: new Date()
        });
    }
    
    return this.save();
};

// Instance method to unsubscribe
newsletterSchema.methods.unsubscribe = function(reason, feedback) {
    this.status = 'unsubscribed';
    this.unsubscribedAt = new Date();
    this.unsubscribeReason = reason;
    if (feedback) {
        this.unsubscribeFeedback = feedback;
    }
    return this.save();
};

// Instance method to resubscribe
newsletterSchema.methods.resubscribe = function() {
    this.status = 'active';
    this.unsubscribedAt = undefined;
    this.unsubscribeReason = undefined;
    this.unsubscribeFeedback = undefined;
    return this.save();
};

// Instance method to record bounce
newsletterSchema.methods.recordBounce = function(type, reason) {
    this.bounces.push({
        date: new Date(),
        type,
        reason
    });
    
    // Mark as bounced if hard bounce or too many soft bounces
    if (type === 'hard' || this.bounces.length >= 5) {
        this.status = 'bounced';
    }
    
    return this.save();
};

// Pre-save middleware to validate interests
newsletterSchema.pre('save', function(next) {
    // Ensure at least one interest is selected for active subscribers
    if (this.status === 'active' && this.interests.length === 0) {
        this.interests = ['packages', 'promotions'];
    }
    next();
});

// Indexes for better query performance
newsletterSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ interests: 1 });
newsletterSchema.index({ tags: 1 });
newsletterSchema.index({ subscriptionDate: -1 });
newsletterSchema.index({ lastEmailOpened: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema); 