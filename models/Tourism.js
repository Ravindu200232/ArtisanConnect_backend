import mongoose from "mongoose";
import User from "./User.js";

// Tourism Provider Schema (extends User)
const tourismProviderSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    businessRegistrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    serviceTypes: [{
        type: String,
        enum: [
            "cultural_tours", "heritage_walks", "craft_workshops", 
            "village_experiences", "cooking_classes", "traditional_performances",
            "artisan_visits", "temple_tours", "nature_craft_tours"
        ],
        required: true
    }],
    operatingRegions: [{
        province: {
            type: String,
            required: true,
            enum: [
                "western", "central", "southern", "northern", 
                "eastern", "north_western", "north_central", 
                "uva", "sabaragamuwa"
            ]
        },
        districts: [String],
        specialties: [String]
    }],
    languages: [{
        language: {
            type: String,
            enum: ["sinhala", "tamil", "english", "german", "french", "japanese", "chinese"],
            required: true
        },
        proficiency: {
            type: String,
            enum: ["basic", "intermediate", "fluent", "native"],
            required: true
        }
    }],
    teamMembers: [{
        name: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["guide", "coordinator", "driver", "instructor", "translator"],
            required: true
        },
        languages: [String],
        experience: Number, // years
        certifications: [String]
    }],
    vehicles: [{
        type: {
            type: String,
            enum: ["car", "van", "bus", "tuk_tuk", "bicycle"],
            required: true
        },
        capacity: {
            type: Number,
            required: true
        },
        registrationNumber: String,
        isAirConditioned: {
            type: Boolean,
            default: false
        },
        features: [String]
    }],
    insuranceDetails: {
        provider: String,
        policyNumber: String,
        coverage: Number,
        expiryDate: Date
    },
    rating: {
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        serviceRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        knowledgeRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        punctualityRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        }
    },
    performance: {
        totalBookings: {
            type: Number,
            default: 0
        },
        completedTours: {
            type: Number,
            default: 0
        },
        cancelledTours: {
            type: Number,
            default: 0
        },
        responseTime: {
            type: Number, // in hours
            default: 24
        }
    }
});

// Tourism Package Schema
const tourismPackageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TourismProvider",
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            "day_tour", "half_day_tour", "multi_day_tour", 
            "workshop", "experience", "cultural_immersion"
        ]
    },
    category: {
        type: String,
        required: true,
        enum: [
            "cultural_heritage", "traditional_crafts", "village_life", 
            "religious_sites", "culinary", "nature_crafts", "festivals"
        ]
    },
    duration: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ["hours", "days"],
            required: true
        }
    },
    itinerary: [{
        time: String, // e.g., "9:00 AM"
        duration: String, // e.g., "2 hours"
        activity: {
            type: String,
            required: true
        },
        location: {
            name: String,
            address: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        description: String,
        includedArtisans: [{
            artisan: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Artisan"
            },
            role: String, // "instructor", "demonstrator", "host"
        }]
    }],
    inclusions: {
        transportation: {
            type: Boolean,
            default: false
        },
        guide: {
            type: Boolean,
            default: true
        },
        meals: [{
            type: String,
            enum: ["breakfast", "lunch", "dinner", "snacks", "welcome_drink"],
            description: String
        }],
        materials: {
            type: Boolean,
            default: false,
            description: String
        },
        souvenirs: {
            type: Boolean,
            default: false,
            description: String
        },
        entrance_fees: {
            type: Boolean,
            default: false
        },
        accommodation: {
            type: Boolean,
            default: false,
            description: String
        }
    },
    pricing: {
        basePrice: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: "LKR"
        },
        priceIncludes: [String],
        groupDiscounts: [{
            minPeople: Number,
            discountPercentage: Number
        }],
        seasonalPricing: [{
            season: {
                type: String,
                enum: ["peak", "off_peak", "shoulder"]
            },
            priceMultiplier: {
                type: Number,
                default: 1
            },
            months: [String]
        }]
    },
    availability: {
        daysOfWeek: [{
            type: String,
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        }],
        timeSlots: [{
            startTime: String,
            endTime: String,
            maxParticipants: Number
        }],
        blackoutDates: [{
            date: Date,
            reason: String
        }],
        advanceBookingRequired: {
            type: Number, // days
            default: 1
        }
    },
    requirements: {
        minParticipants: {
            type: Number,
            default: 1
        },
        maxParticipants: {
            type: Number,
            required: true
        },
        ageRestrictions: {
            minAge: Number,
            maxAge: Number
        },
        fitnessLevel: {
            type: String,
            enum: ["easy", "moderate", "challenging"],
            default: "easy"
        },
        prerequisites: [String],
        whatToBring: [String]
    },
    media: {
        images: [{
            url: {
                type: String,
                required: true
            },
            caption: String,
            isPrimary: {
                type: Boolean,
                default: false
            }
        }],
        videos: [{
            url: String,
            title: String,
            duration: String
        }],
        virtualTour: {
            url: String,
            description: String
        }
    },
    culturalElements: {
        traditionalCrafts: [String],
        culturalSites: [String],
        localStories: [String],
        historicalContext: String,
        culturalSignificance: String
    },
    sustainability: {
        communityBenefit: {
            type: String,
            maxlength: 500
        },
        environmentalImpact: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "low"
        },
        localEmployment: {
            type: Number,
            default: 0
        },
        culturalPreservation: {
            type: Boolean,
            default: true
        }
    },
    booking: {
        instantBooking: {
            type: Boolean,
            default: false
        },
        requiresApproval: {
            type: Boolean,
            default: true
        },
        cancellationPolicy: {
            freeCancel: {
                type: Number, // days before
                default: 7
            },
            partialRefund: {
                days: Number,
                refundPercentage: Number
            },
            noRefund: {
                type: Number, // days before
                default: 1
            }
        }
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        aspectRatings: {
            experience: {
                type: Number,
                default: 0
            },
            value: {
                type: Number,
                default: 0
            },
            guide: {
                type: Number,
                default: 0
            },
            organization: {
                type: Number,
                default: 0
            }
        }
    },
    statistics: {
        totalBookings: {
            type: Number,
            default: 0
        },
        totalParticipants: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        averageGroupSize: {
            type: Number,
            default: 0
        },
        lastBookingDate: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for Tourism Package
tourismPackageSchema.index({ provider: 1 });
tourismPackageSchema.index({ type: 1 });
tourismPackageSchema.index({ category: 1 });
tourismPackageSchema.index({ "pricing.basePrice": 1 });
tourismPackageSchema.index({ "rating.average": -1 });
tourismPackageSchema.index({ createdAt: -1 });

// Text search index
tourismPackageSchema.index({
    title: "text",
    description: "text",
    "culturalElements.traditionalCrafts": "text"
});

// Methods for TourismPackage
tourismPackageSchema.methods.calculatePrice = function(participants, date) {
    let price = this.pricing.basePrice;
    
    // Apply group discount
    for (let discount of this.pricing.groupDiscounts) {
        if (participants >= discount.minPeople) {
            price *= (1 - discount.discountPercentage / 100);
        }
    }
    
    // Apply seasonal pricing
    const month = new Date(date).toLocaleString('default', { month: 'long' });
    for (let seasonal of this.pricing.seasonalPricing) {
        if (seasonal.months.includes(month)) {
            price *= seasonal.priceMultiplier;
        }
    }
    
    return price * participants;
};

tourismPackageSchema.methods.checkAvailability = function(date, participants) {
    // Check if date is not blacked out
    const isBlackedOut = this.availability.blackoutDates.some(blackout => 
        new Date(blackout.date).toDateString() === new Date(date).toDateString()
    );
    
    if (isBlackedOut) return false;
    
    // Check participant limits
    if (participants < this.requirements.minParticipants || 
        participants > this.requirements.maxParticipants) {
        return false;
    }
    
    // Check advance booking requirement
    const daysDiff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysDiff < this.availability.advanceBookingRequired) {
        return false;
    }
    
    return true;
};

// Create models
const TourismProvider = User.discriminator("tourism_provider", tourismProviderSchema);
const TourismPackage = mongoose.model("TourismPackage", tourismPackageSchema);

export { TourismProvider, TourismPackage };