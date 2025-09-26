import mongoose from "mongoose";
const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true
    },
    artisanId: {
        type: String,
        required: true,
        ref: 'Artisan'
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    culturalStory: {
        type: String,
        required: true
    },
    culturalSignificance: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Woodcarving', 'Pottery', 'Textile', 'Jewelry', 'Masks', 'Batik', 'Lacework', 'Metalwork', 'Other']
    },
    subcategory: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'LKR'
    },
    materials: [{
        name: String,
        source: String,
        sustainability: String
    }],
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        weight: Number,
        unit: {
            type: String,
            default: 'cm'
        }
    },
    colors: [String],
    images: [{
        url: String,
        altText: String,
        aiQualityScore: Number, // AI photo quality assessment
        isPrimary: Boolean
    }],
    video: {
        url: String,
        description: String
    },
    availability: {
        type: Boolean,
        default: true
    },
    stock: {
        type: Number,
        default: 1,
        min: 0
    },
    customizable: {
        type: Boolean,
        default: false
    },
    customizationOptions: [{
        option: String,
        choices: [String],
        additionalCost: Number
    }],
    productionTime: {
        type: Number, // in days
        required: true
    },
    shippingInfo: {
        weight: Number,
        dimensions: String,
        fragile: Boolean,
        internationalShipping: Boolean
    },
    tags: [String],
    // AI Features
    aiData: {
        qualityScore: {
            type: Number,
            min: 0,
            max: 100
        },
        photoQualityFeedback: [{
            imageUrl: String,
            score: Number,
            suggestions: [String]
        }],
        demandPrediction: {
            score: Number,
            trend: String,
            bestSeasonality: [String]
        },
        pricingRecommendations: {
            suggestedPrice: Number,
            marketRange: {
                min: Number,
                max: Number
            },
            competitorAnalysis: String
        },
        seoOptimization: {
            suggestedTags: [String],
            titleOptimization: String,
            descriptionOptimization: String
        }
    },
    // Blockchain & NFT
    blockchainData: {
        authenticityCertificate: String,
        nftId: String,
        ownershipHistory: [{
            owner: String,
            date: Date,
            transactionHash: String
        }]
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
    views: {
        type: Number,
        default: 0
    },
    favorites: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Product = mongoose.model("Product", productSchema);
export { Product };