// models/payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    orderId: {
        type: String,
        required: true,
        ref: 'Order'
    },
    customerId: {
        type: String,
        required: true,
        ref: 'Customer'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'LKR'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer', 'digital_wallet', 'crypto', 'cod'],
        required: true
    },
    paymentGateway: {
        type: String,
        enum: ['stripe', 'paypal', 'razorpay', 'local_bank', 'crypto_gateway'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    gatewayTransactionId: String,
    gatewayResponse: {
        status: String,
        message: String,
        data: mongoose.Schema.Types.Mixed
    },
    // Payment details (encrypted in production)
    cardDetails: {
        last4: String,
        brand: String,
        expiryMonth: String,
        expiryYear: String
    },
    billingAddress: {
        street: String,
        city: String,
        province: String,
        postalCode: String,
        country: String
    },
    fees: {
        platformFee: Number,
        paymentGatewayFee: Number,
        totalFees: Number
    },
    // AI fraud detection
    fraudAnalysis: {
        riskScore: {
            type: Number,
            min: 0,
            max: 100
        },
        riskFactors: [String],
        recommendation: {
            type: String,
            enum: ['approve', 'review', 'decline']
        },
        analysis: {
            velocityCheck: Boolean,
            geolocationCheck: Boolean,
            deviceFingerprintCheck: Boolean,
            behaviorAnalysis: Boolean
        }
    },
    refund: {
        refundId: String,
        amount: Number,
        reason: String,
        status: String,
        requestedDate: Date,
        processedDate: Date
    }
}, {
    timestamps: true
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
