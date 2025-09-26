// models/review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    reviewId: {
        type: String,
        required: true,
        unique: true
    },
    productId: {
        type: String,
        required: true,
        ref: 'Product'
    },
    customerId: {
        type: String,
        required: true,
        ref: 'Customer'
    },
    customerName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    images: [{
        url: String,
        caption: String
    }],
    pros: [String],
    cons: [String],
    wouldRecommend: {
        type: Boolean,
        default: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    moderationNotes: String,
    helpfulVotes: {
        type: Number,
        default: 0
    },
    // AI features
    sentimentAnalysis: {
        overall: {
            type: String,
            enum: ['positive', 'neutral', 'negative']
        },
        confidence: Number,
        aspects: [{
            aspect: String,
            sentiment: String,
            score: Number
        }]
    },
    qualityIndicators: {
        detailLevel: Number, // 0-100
        authenticity: Number, // 0-100
        helpfulness: Number // 0-100
    }
}, {
    timestamps: true
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;