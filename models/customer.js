import mongoose from "mongoose";
const customerSchema = new mongoose.Schema({
    customerId: {
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
    phone: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg"
    },
    addresses: [{
        type: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        },
        street: String,
        city: String,
        province: String,
        postalCode: String,
        country: String,
        isDefault: Boolean
    }],
    preferences: {
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'USD'
        },
        categories: [String],
        priceRange: {
            min: Number,
            max: Number
        },
        culturalInterests: [String],
        craftTechniques: [String]
    },
    // AI Personalization
    aiProfile: {
        culturalPersonality: [{
            trait: String,
            score: Number
        }],
        purchasePatterns: [{
            category: String,
            frequency: String,
            averageSpent: Number,
            seasonality: [String]
        }],
        recommendations: [{
            productId: String,
            score: Number,
            reasoning: String,
            date: Date
        }],
        searchHistory: [{
            query: String,
            category: String,
            date: Date
        }],
        viewHistory: [{
            productId: String,
            duration: Number,
            date: Date
        }]
    },
    socialLogin: {
        googleId: String,
        facebookId: String,
        appleId: String
    },
    wishlist: [{
        productId: String,
        addedDate: Date
    }],
    cart: [{
        productId: String,
        quantity: Number,
        customizations: [{
            option: String,
            choice: String
        }],
        addedDate: Date
    }],
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
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
    }
}, {
    timestamps: true
});

const Customer = mongoose.model("Customer", customerSchema);
export { Customer };