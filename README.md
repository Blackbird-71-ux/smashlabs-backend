# 🔥 SmashLabs Backend API

A comprehensive backend API for the SmashLabs stress relief and team building business.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Email service (Gmail/SMTP)

### Installation

1. **Clone and setup**
   ```bash
   cd smashlabs-backend
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Server
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   # Database
   MONGODB_URI=mongodb://localhost:27017/smashlabs

   # Email (Gmail example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@smashlabs.in

   # Business
   BUSINESS_NAME=SmashLabs
   BUSINESS_EMAIL=info@smashlabs.in
   BUSINESS_PHONE=+1800SMASHNOW
   ```

3. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📡 API Endpoints

### 🏥 Health Check
- `GET /health` - Server health status

### 📅 Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/availability?date=YYYY-MM-DD` - Check availability
- `GET /api/bookings/pricing` - Get package pricing

### 📞 Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact/status/:ticketId` - Check ticket status

### 📧 Newsletter
- `POST /api/newsletter` - Subscribe to newsletter
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `GET /api/newsletter/stats` - Public stats

### 🔐 Admin (Requires Auth)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/bookings` - List all bookings
- `PUT /api/admin/bookings/:id/status` - Update booking status
- `GET /api/admin/contacts` - List all contacts

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# Test booking (example)
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "date": "2025-02-15",
    "time": "14:00",
    "guests": 2,
    "package": "premium",
    "message": "Looking forward to the experience!"
  }'
```

## 🏗️ Architecture

```
smashlabs-backend/
├── app.js              # Main application
├── config/
│   ├── index.js        # Configuration
│   └── database.js     # Database connection
├── models/
│   ├── Booking.js      # Booking schema
│   ├── Contact.js      # Contact schema
│   └── Newsletter.js   # Newsletter schema
├── routes/
│   ├── bookings.js     # Booking endpoints
│   ├── contact.js      # Contact endpoints
│   ├── newsletter.js   # Newsletter endpoints
│   └── admin.js        # Admin endpoints
└── services/
    └── emailService.js # Email handling
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/smashlabs |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_USER` | Email username | - |
| `EMAIL_PASS` | Email password | - |
| `BASIC_PACKAGE_PRICE` | Basic package price (INR) | 2500 |
| `PREMIUM_PACKAGE_PRICE` | Premium package price (INR) | 4500 |
| `ULTIMATE_PACKAGE_PRICE` | Ultimate package price (INR) | 6500 |

### Package Pricing
- **Basic**: ₹2,500 (30 minutes)
- **Premium**: ₹4,500 (60 minutes)  
- **Ultimate**: ₹6,500 (90 minutes)
- **Corporate**: Custom pricing with 15% discount

## 📊 Features

### ✅ Implemented
- Complete booking system with validation
- Contact form with ticket management
- Newsletter subscription management
- Email notifications (booking confirmations, contact responses)
- Admin dashboard with basic auth
- Package pricing and availability checking
- Rate limiting and security measures

### 🚧 Next Steps
- Payment integration (Stripe/Razorpay)
- JWT authentication for admin
- Advanced analytics and reporting
- Calendar integration
- SMS notifications
- Customer dashboard

## 🤝 Integration with Frontend

The backend is designed to work seamlessly with the SmashLabs Next.js frontend. All API endpoints match the expected contract from the frontend application.

**Frontend API Base URL**: Set `NEXT_PUBLIC_API_URL=http://localhost:5000/api` in your frontend `.env.local`

## 🛠️ Development

```bash
# Start in development mode with auto-reload
npm run dev

# Check database connection
npm run db:status

# Setup fresh installation
npm run setup
```

## 📝 Notes

- Default admin auth is basic - implement JWT in production
- Email service requires proper SMTP configuration
- MongoDB must be running before starting the server
- CORS is configured for frontend on port 3000

---

**SmashLabs** - Transforming stress into strength! 🔥 