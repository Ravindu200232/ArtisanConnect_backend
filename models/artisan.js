import mongoose from "mongoose";

const artisanSchema = new mongoose.Schema({
    artisanId: {
        type: String,
        required: true,
        unique: true
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
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    businessName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg"
    },
    workshopImages: [{
        type: String
    }],
    craftSpecialties: [{
        type: String,
        required: true
    }],
    experienceYears: {
        type: Number,
        required: true,
        min: 0
    },
    bio: {
        type: String,
        required: true
    },
    culturalBackground: {
        type: String,
        required: true
    },
    traditionalTechniques: [{
        technique: String,
        description: String,
        masterLevel: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced', 'Master'],
            default: 'Intermediate'
        }
    }],
    certifications: [{
        name: String,
        issuer: String,
        date: Date,
        blockchainHash: String, // For blockchain verification
        nftId: String // For NFT certificate
    }],
    socialMedia: {
        facebook: String,
        instagram: String,
        youtube: String,
        website: String
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
    totalSales: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
        branchCode: String
    },
    // AI Features
    aiInsights: {
        performanceScore: {
            type: Number,
            default: 0
        },
        recommendations: [String],
        demandForecast: [{
            product: String,
            prediction: Number,
            month: String
        }],
        pricingOptimization: [{
            product: String,
            suggestedPrice: Number,
            currentPrice: Number,
            reasoning: String
        }]
    },
    // IoT Workshop Data
    iotWorkshopData: {
        temperature: Number,
        humidity: Number,
        lightLevel: Number,
        productionTime: [{
            product: String,
            timeSpent: Number,
            date: Date
        }],
        materialUsage: [{
            material: String,
            quantity: Number,
            date: Date
        }]
    }
}, {
    timestamps: true
});

const Artisan = mongoose.model("Artisan", artisanSchema);
export default Artisan;