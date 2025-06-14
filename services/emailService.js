const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Create transporter based on environment variables
        const emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };

        this.transporter = nodemailer.createTransport(emailConfig);

        // Verify transporter configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('Email transporter verification failed:', error);
            } else {
                console.log('✅ Email service is ready to send messages');
            }
        });
    }

    // Send booking confirmation email to customer
    async sendBookingConfirmation(booking) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs Team" <${process.env.EMAIL_USER}>`,
            to: booking.customerEmail,
            subject: `Booking Confirmation - ${booking.bookingId}`,
            html: this.generateBookingConfirmationHTML(booking),
            text: this.generateBookingConfirmationText(booking)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Booking confirmation email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send booking confirmation email:', error);
            throw error;
        }
    }

    // Send booking notification to admin
    async sendBookingNotification(booking) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `New Booking Alert - ${booking.bookingId}`,
            html: this.generateBookingNotificationHTML(booking),
            text: this.generateBookingNotificationText(booking)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Booking notification email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send booking notification email:', error);
            throw error;
        }
    }

    // Send booking status update to customer
    async sendBookingStatusUpdate(booking, oldStatus) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs Team" <${process.env.EMAIL_USER}>`,
            to: booking.customerEmail,
            subject: `Booking Update - ${booking.bookingId}`,
            html: this.generateBookingStatusUpdateHTML(booking, oldStatus),
            text: this.generateBookingStatusUpdateText(booking, oldStatus)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Booking status update email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send booking status update email:', error);
            throw error;
        }
    }

    // Send contact acknowledgment to customer
    async sendContactAcknowledgment(contact) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs Team" <${process.env.EMAIL_USER}>`,
            to: contact.email,
            subject: 'Thank you for contacting SmashLabs',
            html: this.generateContactAcknowledgmentHTML(contact),
            text: this.generateContactAcknowledgmentText(contact)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Contact acknowledgment email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send contact acknowledgment email:', error);
            throw error;
        }
    }

    // Send contact notification to admin
    async sendContactNotification(contact) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `New Contact Message - ${contact.inquiryType.toUpperCase()}`,
            html: this.generateContactNotificationHTML(contact),
            text: this.generateContactNotificationText(contact)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Contact notification email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send contact notification email:', error);
            throw error;
        }
    }

    // Send contact response to customer
    async sendContactResponse(contact, response) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs Team" <${process.env.EMAIL_USER}>`,
            to: contact.email,
            subject: `Re: ${contact.subject}`,
            html: this.generateContactResponseHTML(contact, response),
            text: this.generateContactResponseText(contact, response)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Contact response email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send contact response email:', error);
            throw error;
        }
    }

    // Send newsletter welcome email
    async sendNewsletterWelcome(subscriber) {
        if (!this.transporter) {
            throw new Error('Email transporter not initialized');
        }

        const mailOptions = {
            from: `"SmashLabs Team" <${process.env.EMAIL_USER}>`,
            to: subscriber.email,
            subject: 'Welcome to SmashLabs Newsletter!',
            html: this.generateNewsletterWelcomeHTML(subscriber),
            text: this.generateNewsletterWelcomeText(subscriber)
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Newsletter welcome email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Failed to send newsletter welcome email:', error);
            throw error;
        }
    }

    // HTML Email Templates

    generateBookingConfirmationHTML(booking) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Booking Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff4444; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .booking-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
                .button { display: inline-block; padding: 10px 20px; background: #ff4444; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 SmashLabs</h1>
                    <h2>Booking Confirmed!</h2>
                </div>
                <div class="content">
                    <p>Hi ${booking.customerName},</p>
                    <p>Great news! Your stress relief session has been booked successfully.</p>
                    
                    <div class="booking-details">
                        <h3>📋 Booking Details</h3>
                        <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                        <p><strong>Package:</strong> ${booking.packageName}</p>
                        <p><strong>Date:</strong> ${booking.formattedDate}</p>
                        <p><strong>Time:</strong> ${booking.preferredTime}</p>
                        <p><strong>Duration:</strong> ${booking.duration} minutes</p>
                        <p><strong>Participants:</strong> ${booking.participants}</p>
                        <p><strong>Total Cost:</strong> ₹${booking.packagePrice}</p>
                    </div>
                    
                    ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
                    
                    <p>📍 <strong>Location:</strong> ${process.env.COMPANY_ADDRESS}</p>
                    <p>📞 <strong>Contact:</strong> ${process.env.COMPANY_PHONE}</p>
                    
                    <p>We'll contact you soon to confirm the final details. Get ready to smash away your stress! 💪</p>
                </div>
                <div class="footer">
                    <p>Thank you for choosing SmashLabs!</p>
                    <p>Need help? Contact us at ${process.env.COMPANY_EMAIL}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateContactAcknowledgmentHTML(contact) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Message Received</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff4444; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 SmashLabs</h1>
                    <h2>Message Received!</h2>
                </div>
                <div class="content">
                    <p>Hi ${contact.name},</p>
                    <p>Thank you for contacting SmashLabs! We've received your message and will get back to you within 24 hours.</p>
                    
                    <p><strong>Your Message:</strong></p>
                    <p><em>"${contact.message}"</em></p>
                    
                    <p>Our team is reviewing your inquiry and will respond shortly. If you have an urgent matter, please call us directly at ${process.env.COMPANY_PHONE}.</p>
                    
                    <p>Thanks for your interest in SmashLabs! 💪</p>
                </div>
                <div class="footer">
                    <p>SmashLabs - Your Stress Relief Destination</p>
                    <p>${process.env.COMPANY_EMAIL} | ${process.env.COMPANY_PHONE}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateNewsletterWelcomeHTML(subscriber) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to SmashLabs Newsletter</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff4444; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 SmashLabs</h1>
                    <h2>Welcome to Our Newsletter!</h2>
                </div>
                <div class="content">
                    <p>Hi ${subscriber.name || 'there'},</p>
                    <p>Welcome to the SmashLabs newsletter! You're now part of our stress-busting community. 🎉</p>
                    
                    <p>Here's what you can expect from us:</p>
                    <ul>
                        <li>🆕 Latest package updates and special offers</li>
                        <li>💡 Stress management tips and techniques</li>
                        <li>📅 Upcoming events and workshops</li>
                        <li>🎁 Exclusive subscriber discounts</li>
                    </ul>
                    
                    <p>Ready to smash your stress away? Book your session today!</p>
                </div>
                <div class="footer">
                    <p>SmashLabs - Your Stress Relief Destination</p>
                    <p>You're receiving this because you subscribed to our newsletter.</p>
                    <p><a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Text versions of emails (fallback for HTML)

    generateBookingConfirmationText(booking) {
        return `
SmashLabs - Booking Confirmed!

Hi ${booking.customerName},

Your stress relief session has been booked successfully!

Booking Details:
- Booking ID: ${booking.bookingId}
- Package: ${booking.packageName}
- Date: ${booking.formattedDate}
- Time: ${booking.preferredTime}
- Duration: ${booking.duration} minutes
- Participants: ${booking.participants}
- Total Cost: ₹${booking.packagePrice}

${booking.specialRequests ? `Special Requests: ${booking.specialRequests}` : ''}

Location: ${process.env.COMPANY_ADDRESS}
Contact: ${process.env.COMPANY_PHONE}

We'll contact you soon to confirm the final details. Get ready to smash away your stress!

Thank you for choosing SmashLabs!
        `;
    }

    generateContactAcknowledgmentText(contact) {
        return `
SmashLabs - Message Received!

Hi ${contact.name},

Thank you for contacting SmashLabs! We've received your message and will get back to you within 24 hours.

Your Message: "${contact.message}"

Our team is reviewing your inquiry and will respond shortly. If you have an urgent matter, please call us directly at ${process.env.COMPANY_PHONE}.

Thanks for your interest in SmashLabs!

SmashLabs Team
${process.env.COMPANY_EMAIL} | ${process.env.COMPANY_PHONE}
        `;
    }

    generateNewsletterWelcomeText(subscriber) {
        return `
SmashLabs - Welcome to Our Newsletter!

Hi ${subscriber.name || 'there'},

Welcome to the SmashLabs newsletter! You're now part of our stress-busting community.

Here's what you can expect from us:
- Latest package updates and special offers
- Stress management tips and techniques
- Upcoming events and workshops
- Exclusive subscriber discounts

Ready to smash your stress away? Book your session today!

SmashLabs Team
        `;
    }

    // Additional template generators for other email types...
    generateBookingNotificationHTML(booking) {
        return `<h2>New Booking Alert</h2><p>Booking ID: ${booking.bookingId}</p><p>Customer: ${booking.customerName}</p><p>Package: ${booking.packageName}</p><p>Date: ${booking.formattedDate}</p>`;
    }

    generateBookingNotificationText(booking) {
        return `New Booking Alert\nBooking ID: ${booking.bookingId}\nCustomer: ${booking.customerName}\nPackage: ${booking.packageName}`;
    }

    generateBookingStatusUpdateHTML(booking, oldStatus) {
        return `<h2>Booking Status Update</h2><p>Your booking ${booking.bookingId} status has been changed from ${oldStatus} to ${booking.status}</p>`;
    }

    generateBookingStatusUpdateText(booking, oldStatus) {
        return `Booking Status Update\nYour booking ${booking.bookingId} status has been changed from ${oldStatus} to ${booking.status}`;
    }

    generateContactNotificationHTML(contact) {
        return `<h2>New Contact Message</h2><p>From: ${contact.name} (${contact.email})</p><p>Subject: ${contact.subject}</p><p>Message: ${contact.message}</p>`;
    }

    generateContactNotificationText(contact) {
        return `New Contact Message\nFrom: ${contact.name} (${contact.email})\nSubject: ${contact.subject}\nMessage: ${contact.message}`;
    }

    generateContactResponseHTML(contact, response) {
        return `<h2>Response to Your Inquiry</h2><p>Hi ${contact.name},</p><p>${response}</p><p>Best regards,<br>SmashLabs Team</p>`;
    }

    generateContactResponseText(contact, response) {
        return `Response to Your Inquiry\n\nHi ${contact.name},\n\n${response}\n\nBest regards,\nSmashLabs Team`;
    }
}

module.exports = new EmailService(); 