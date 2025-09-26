
import mongoose from "mongoose";
const supplierSchema = new mongoose.Schema({
    supplierId: {
        type: String,
        required: true,
        unique: true
    },
    companyName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    contactPerson: {
        firstName: String,
        lastName: String,
        designation: String,
        phone: String,
        email: String
    },
    address: {
        street: String,
        city: String,
        province: String,
        country: String,
        postalCode: String
    },
    businessRegistration: {
        number: String,
        type: String,
        registrationDate: Date
    },
    categories: [{
        type: String,
        enum: ['Wood', 'Clay', 'Fabric', 'Metals', 'Gemstones', 'Natural Fibers', 'Dyes', 'Tools', 'Other']
    }],
    materials: [{
        name: String,
        category: String,
        description: String,
        unit: String,
        pricePerUnit: Number,
        minimumOrder: Number,
        availability: Boolean,
        sustainabilityInfo: {
            isEcoFriendly: Boolean,
            certifications: [String],
            sourceLocation: String,
            harvestMethod: String
        },
        iotSensorData: {
            temperature: Number,
            humidity: Number,
            lastUpdated: Date
        }
    }],
    // Smart Contract Integration
    blockchainData: {
        walletAddress: String,
        smartContracts: [{
            contractId: String,
            type: String,
            terms: String,
            status: String
        }]
    },
    // AI Features
    aiAnalytics: {
        demandForecast: [{
            material: String,
            predictedDemand: Number,
            confidence: Number,
            month: String
        }],
        pricingOptimization: [{
            material: String,
            suggestedPrice: Number,
            currentPrice: Number,
            marketTrends: String
        }],
        performanceMetrics: {
            deliveryScore: Number,
            qualityScore: Number,
            sustainabilityScore: Number
        }
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
    certifications: [{
        name: String,
        issuer: String,
        expiryDate: Date,
        documentUrl: String
    }],
    paymentTerms: {
        method: [String],
        creditDays: Number,
        currency: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export { Supplier };