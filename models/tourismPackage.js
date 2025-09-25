
import mongoose from "mongoose";
const tourismPackageSchema = new mongoose.Schema({
    packageId: {
        type: String,
        required: true,
        unique: true
    },
    providerId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    culturalExperience: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Workshop', 'Cultural Tour', 'Heritage Site', 'Craft Village', 'Master Class', 'Cultural Event'],
        required: true
    },
    location: {
        province: String,
        city: String,
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        nearbyAttractions: [String]
    },
    duration: {
        hours: Number,
        days: Number
    },
    maxParticipants: {
        type: Number,
        required: true
    },
    price: {
        adult: Number,
        child: Number,
        currency: String
    },
    inclusions: [String],
    exclusions: [String],
    requirements: [String],
    language: [String],
    difficulty: {
        type: String,
        enum: ['Easy', 'Moderate', 'Challenging'],
        default: 'Easy'
    },
    artisansInvolved: [{
        artisanId: String,
        role: String,
        skills: [String]
    }],
    craftsTaught: [String],
    culturalElements: [String],
    // AI Features
    aiPersonalization: {
        recommendedFor: [{
            personalityType: String,
            score: Number
        }],
        culturalInsights: [String],
        learningObjectives: [String]
    },
    // VR/AR Integration
    virtualContent: {
        has360Video: Boolean,
        vrExperienceUrl: String,
        arMarkersUrl: String,
        previewImages: [String]
    },
    schedule: [{
        dayNumber: Number,
        activities: [{
            time: String,
            activity: String,
            location: String,
            duration: Number
        }]
    }],
    bookingInfo: {
        advanceBookingDays: Number,
        cancellationPolicy: String,
        paymentTerms: String
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    totalBookings: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const TourismPackage = mongoose.model("TourismPackage", tourismPackageSchema);
export { TourismPackage };