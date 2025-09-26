// models/inquiry.js
import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema({
    inquiryId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: String,
        ref: 'Customer'
    },
    customerName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    type: {
        type: String,
        enum: ['general', 'technical', 'complaint', 'suggestion', 'order_related', 'product_inquiry'],
        default: 'general'
    },
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    attachments: [{
        filename: String,
        url: String,
        size: Number
    }],
    priority: {
        type: Number,
        enum: [1, 2, 3], // 1: Low, 2: Medium, 3: High
        default: 1
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'responded', 'resolved', 'closed'],
        default: 'open'
    },
    assignedTo: {
        userId: String,
        userName: String,
        role: String
    },
    response: String,
    responseDate: Date,
    resolutionDate: Date,
    tags: [String],
    // AI features
    category: {
        predicted: String,
        confidence: Number
    },
    urgency: {
        predicted: String,
        factors: [String]
    },
    suggestedResponse: String,
    relatedFAQs: [{
        question: String,
        answer: String,
        relevanceScore: Number
    }]
}, {
    timestamps: true
});

const Inquiry = mongoose.model("Inquiry", inquirySchema);
export default Inquiry;
