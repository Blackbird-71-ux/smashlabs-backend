const express = require('express');
const router = express.Router();

// Package data - in a real app, this might come from a database
const packages = [
    {
        id: 'basic',
        name: 'Basic Stress Relief',
        type: 'basic',
        price: 500,
        currency: 'INR',
        duration: 30,
        description: 'Perfect for quick stress relief sessions',
        features: [
            '30-minute session',
            'Basic equipment access',
            'Personal protective gear included',
            'Music of your choice',
            'Post-session relaxation area'
        ],
        includes: [
            'Safety briefing',
            'Equipment rental',
            'Clean-up service',
            'Refreshments'
        ],
        maxParticipants: 2,
        availability: 'Walk-in friendly',
        popular: false
    },
    {
        id: 'premium',
        name: 'Premium Rage Room',
        type: 'premium',
        price: 800,
        currency: 'INR',
        duration: 60,
        description: 'Enhanced experience with more variety and time',
        features: [
            '60-minute session',
            'Premium equipment selection',
            'Variety of breakable items',
            'Themed room options',
            'Photo/video session',
            'Post-session consultation'
        ],
        includes: [
            'Everything in Basic',
            'Extended item selection',
            'Professional photography',
            'Stress management tips',
            'Healthy snacks & drinks'
        ],
        maxParticipants: 4,
        availability: 'Advance booking recommended',
        popular: true
    },
    {
        id: 'ultimate',
        name: 'Ultimate Destruction',
        type: 'ultimate',
        price: 1200,
        currency: 'INR',
        duration: 90,
        description: 'The complete stress relief experience',
        features: [
            '90-minute session',
            'VIP room access',
            'Premium destruction items',
            'Multiple themed rooms',
            'Professional video recording',
            'Stress counseling session',
            'Group activities'
        ],
        includes: [
            'Everything in Premium',
            'VIP treatment',
            'Professional counseling',
            'Group coordination',
            'Premium refreshments',
            'Keepsake video'
        ],
        maxParticipants: 6,
        availability: 'Must book in advance',
        popular: false
    }
];

// @route   GET /api/packages
// @desc    Get all packages
// @access  Public
router.get('/', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                packages,
                currency: 'INR',
                note: 'All prices are inclusive of taxes and safety equipment'
            }
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch packages',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/packages/:type
// @desc    Get specific package by type
// @access  Public
router.get('/:type', (req, res) => {
    try {
        const packageType = req.params.type.toLowerCase();
        const package = packages.find(pkg => pkg.type === packageType);
        
        if (!package) {
            return res.status(404).json({
                success: false,
                message: 'Package not found',
                availableTypes: packages.map(pkg => pkg.type)
            });
        }

        res.json({
            success: true,
            data: package
        });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch package',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/packages/popular/featured
// @desc    Get featured/popular packages
// @access  Public
router.get('/popular/featured', (req, res) => {
    try {
        const popularPackages = packages.filter(pkg => pkg.popular);
        
        res.json({
            success: true,
            data: {
                packages: popularPackages,
                message: popularPackages.length > 0 
                    ? 'Most popular packages' 
                    : 'All packages are equally popular!'
            }
        });
    } catch (error) {
        console.error('Error fetching popular packages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch popular packages',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/packages/pricing/comparison
// @desc    Get pricing comparison data
// @access  Public
router.get('/pricing/comparison', (req, res) => {
    try {
        const comparison = packages.map(pkg => ({
            type: pkg.type,
            name: pkg.name,
            price: pkg.price,
            duration: pkg.duration,
            maxParticipants: pkg.maxParticipants,
            keyFeatures: pkg.features.slice(0, 3), // Top 3 features
            pricePerMinute: Math.round(pkg.price / pkg.duration),
            pricePerPerson: Math.round(pkg.price / pkg.maxParticipants),
            popular: pkg.popular
        }));

        res.json({
            success: true,
            data: {
                comparison,
                currency: 'INR',
                notes: [
                    'All prices include safety equipment and basic refreshments',
                    'Group discounts available for bookings above 4 people',
                    'Corporate packages available on request'
                ]
            }
        });
    } catch (error) {
        console.error('Error fetching pricing comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing comparison',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/packages/calculate
// @desc    Calculate total price based on package and participants
// @access  Public
router.post('/calculate', (req, res) => {
    try {
        const { packageType, participants = 1, duration, addOns = [] } = req.body;

        // Validate input
        if (!packageType) {
            return res.status(400).json({
                success: false,
                message: 'Package type is required'
            });
        }

        const package = packages.find(pkg => pkg.type === packageType.toLowerCase());
        if (!package) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Validate participants
        if (participants > package.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${package.maxParticipants} participants allowed for ${package.name}`,
                maxParticipants: package.maxParticipants
            });
        }

        // Base calculation
        let totalPrice = package.price;
        let breakdown = [{
            item: `${package.name} (${package.duration} min)`,
            price: package.price,
            quantity: 1
        }];

        // Additional participants (if package allows group pricing)
        if (participants > 1) {
            const additionalParticipants = participants - 1;
            const additionalCost = Math.round(package.price * 0.5 * additionalParticipants); // 50% for additional participants
            totalPrice += additionalCost;
            breakdown.push({
                item: `Additional participants (${additionalParticipants})`,
                price: additionalCost,
                quantity: 1
            });
        }

        // Extended duration (if requested)
        if (duration && duration > package.duration) {
            const extraTime = duration - package.duration;
            const extraCost = Math.round((package.price / package.duration) * extraTime * 0.8); // 80% rate for extra time
            totalPrice += extraCost;
            breakdown.push({
                item: `Extended duration (${extraTime} min)`,
                price: extraCost,
                quantity: 1
            });
        }

        // Add-ons (if any)
        const availableAddOns = {
            photography: { name: 'Professional Photography', price: 200 },
            videography: { name: 'Video Recording', price: 300 },
            counseling: { name: 'Post-session Counseling', price: 500 },
            refreshments: { name: 'Premium Refreshments', price: 150 },
            group_coordination: { name: 'Group Activity Coordination', price: 250 }
        };

        addOns.forEach(addOn => {
            if (availableAddOns[addOn]) {
                const service = availableAddOns[addOn];
                totalPrice += service.price;
                breakdown.push({
                    item: service.name,
                    price: service.price,
                    quantity: 1
                });
            }
        });

        // Apply taxes
        const taxRate = 0.18; // 18% GST
        const taxAmount = Math.round(totalPrice * taxRate);
        const finalTotal = totalPrice + taxAmount;

        res.json({
            success: true,
            data: {
                package: {
                    type: package.type,
                    name: package.name,
                    baseDuration: package.duration
                },
                participants,
                requestedDuration: duration || package.duration,
                breakdown,
                subtotal: totalPrice,
                tax: {
                    rate: '18%',
                    amount: taxAmount
                },
                total: finalTotal,
                currency: 'INR',
                savings: package.popular ? Math.round(finalTotal * 0.1) : 0, // 10% savings on popular packages
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Valid for 24 hours
            }
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate price',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/packages/addons/available
// @desc    Get available add-on services
// @access  Public
router.get('/addons/available', (req, res) => {
    try {
        const addOns = [
            {
                id: 'photography',
                name: 'Professional Photography',
                description: 'Capture your stress-relief moments with professional photos',
                price: 200,
                duration: 'Included in session',
                includes: ['10-15 high-quality photos', 'Basic editing', 'Digital delivery']
            },
            {
                id: 'videography',
                name: 'Video Recording',
                description: 'Get a keepsake video of your destruction session',
                price: 300,
                duration: 'Full session coverage',
                includes: ['Professional video recording', 'Basic editing', 'MP4 delivery']
            },
            {
                id: 'counseling',
                name: 'Post-session Counseling',
                description: 'Professional stress management consultation',
                price: 500,
                duration: '30 minutes',
                includes: ['Stress assessment', 'Coping strategies', 'Follow-up resources']
            },
            {
                id: 'refreshments',
                name: 'Premium Refreshments',
                description: 'Enhanced food and beverage options',
                price: 150,
                duration: 'Throughout session',
                includes: ['Healthy snacks', 'Fresh juices', 'Energy drinks', 'Relaxation tea']
            },
            {
                id: 'group_coordination',
                name: 'Group Activity Coordination',
                description: 'Professional facilitation for group sessions',
                price: 250,
                duration: 'Full session',
                includes: ['Team building activities', 'Group dynamics guidance', 'Conflict resolution']
            }
        ];

        res.json({
            success: true,
            data: {
                addOns,
                currency: 'INR',
                note: 'Add-ons can be combined with any package'
            }
        });
    } catch (error) {
        console.error('Error fetching add-ons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch add-ons',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 