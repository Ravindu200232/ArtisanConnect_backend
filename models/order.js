// models/order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: String,
        required: true,
        ref: 'Customer'
    },
    items: [{
        productId: {
            type: String,
            required: true,
            ref: 'Product'
        },
        artisanId: {
            type: String,
            required: true,
            ref: 'Artisan'
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        customizations: [{
            option: String,
            choice: String,
            additionalCost: Number
        }]
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'LKR'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentId: {
        type: String
    },
    shippingAddress: {
        street: String,
        city: String,
        province: String,
        postalCode: String,
        country: String,
        phone: String
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    shippedDate: Date,
    deliveredDate: Date,
    notes: String,
    // AI-powered features
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    fraudAnalysis: {
        score: Number,
        factors: [String],
        recommendation: String
    }
}, {
    timestamps: true
});

const Order = mongoose.model("Order", orderSchema);
export default Order;





