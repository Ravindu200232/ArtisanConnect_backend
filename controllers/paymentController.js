// controllers/paymentController.js
import Payment from "../models/payment.js";
import Order from "../models/order.js";
import crypto from "crypto";

export async function processPayment(req, res) {
    try {
        const { 
            orderId, 
            paymentMethod, 
            paymentGateway, 
            cardDetails,
            billingAddress 
        } = req.body;

        // Verify order exists and belongs to user
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (req.user.role === "customer" && order.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Generate payment ID
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        // AI Fraud Detection
        const fraudAnalysis = await performFraudAnalysis(order, paymentMethod, req);

        if (fraudAnalysis.recommendation === 'decline') {
            return res.status(400).json({
                message: "Payment declined due to security concerns",
                reason: "fraud_detection"
            });
        }

        // Process payment with gateway
        const gatewayResult = await processWithPaymentGateway({
            paymentGateway,
            amount: order.totalAmount,
            currency: order.currency,
            cardDetails,
            orderId
        });

        // Calculate fees
        const fees = calculatePaymentFees(order.totalAmount, paymentGateway, paymentMethod);

        const paymentData = {
            paymentId,
            orderId,
            customerId: order.customerId,
            amount: order.totalAmount,
            currency: order.currency,
            paymentMethod,
            paymentGateway,
            status: gatewayResult.success ? 'completed' : 'failed',
            gatewayTransactionId: gatewayResult.transactionId,
            gatewayResponse: gatewayResult,
            cardDetails: cardDetails ? {
                last4: cardDetails.number.slice(-4),
                brand: detectCardBrand(cardDetails.number),
                expiryMonth: cardDetails.expiry.split('/')[0],
                expiryYear: cardDetails.expiry.split('/')[1]
            } : null,
            billingAddress,
            fees,
            fraudAnalysis
        };

        const newPayment = new Payment(paymentData);
        await newPayment.save();

        // Update order status
        if (gatewayResult.success) {
            await Order.findOneAndUpdate(
                { orderId },
                { 
                    paymentStatus: 'paid',
                    paymentId: paymentId,
                    status: 'confirmed'
                }
            );
        }

        res.status(gatewayResult.success ? 201 : 400).json({
            message: gatewayResult.success ? "Payment processed successfully" : "Payment failed",
            payment: {
                paymentId: paymentId,
                status: paymentData.status,
                amount: paymentData.amount,
                currency: paymentData.currency
            },
            gatewayResponse: gatewayResult.success ? "Success" : gatewayResult.error
        });

    } catch (err) {
        console.error("Process payment error:", err);
        res.status(500).json({
            message: "Failed to process payment",
            error: err.message
        });
    }
}

export async function getPaymentStatus(req, res) {
    try {
        const { paymentId } = req.params;
        
        const payment = await Payment.findOne({ paymentId })
            .populate('orderId', 'orderId totalAmount status');

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        // Check access permissions
        if (req.user.role === "customer" && payment.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.json({
            message: "Payment status retrieved successfully",
            payment: {
                paymentId: payment.paymentId,
                orderId: payment.orderId,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                createdAt: payment.createdAt,
                cardDetails: payment.cardDetails
            }
        });

    } catch (err) {
        console.error("Get payment status error:", err);
        res.status(500).json({
            message: "Failed to retrieve payment status",
            error: err.message
        });
    }
}

export async function getAllPayments(req, res) {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        const { 
            status, 
            paymentMethod, 
            dateFrom, 
            dateTo,
            page = 1, 
            limit = 20 
        } = req.query;

        let query = {};
        if (status) query.status = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('orderId', 'orderId')
            .populate('customerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-gatewayResponse -cardDetails');

        const total = await Payment.countDocuments(query);

        res.json({
            message: "Payments retrieved successfully",
            payments: payments,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: payments.length,
                totalPayments: total
            }
        });

    } catch (err) {
        console.error("Get payments error:", err);
        res.status(500).json({
            message: "Failed to retrieve payments",
            error: err.message
        });
    }
}

export async function refundPayment(req, res) {
    try {
        if (req.user.role !== "admin" && req.user.role !== "artisan") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const { paymentId } = req.params;
        const { amount, reason } = req.body;

        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({
                message: "Can only refund completed payments"
            });
        }

        const refundAmount = amount || payment.amount;
        if (refundAmount > payment.amount) {
            return res.status(400).json({
                message: "Refund amount cannot exceed payment amount"
            });
        }

        // Process refund with gateway
        const refundResult = await processRefundWithGateway({
            paymentGateway: payment.paymentGateway,
            gatewayTransactionId: payment.gatewayTransactionId,
            refundAmount: refundAmount
        });

        // Update payment record
        const refundData = {
            refundId: `REF_${Date.now()}`,
            amount: refundAmount,
            reason: reason,
            status: refundResult.success ? 'completed' : 'failed',
            requestedDate: new Date(),
            processedDate: refundResult.success ? new Date() : null
        };

        await Payment.findOneAndUpdate(
            { paymentId },
            { 
                refund: refundData,
                status: refundResult.success ? 'refunded' : payment.status
            }
        );

        // Update order status
        if (refundResult.success) {
            await Order.findOneAndUpdate(
                { orderId: payment.orderId },
                { 
                    status: 'refunded',
                    paymentStatus: 'refunded'
                }
            );
        }

        res.json({
            message: refundResult.success ? "Refund processed successfully" : "Refund failed",
            refund: refundData
        });

    } catch (err) {
        console.error("Refund payment error:", err);
        res.status(500).json({
            message: "Failed to process refund",
            error: err.message
        });
    }
}

export async function getPaymentAnalytics(req, res) {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        const analytics = await Payment.aggregate([
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: 1 },
                    totalRevenue: { $sum: "$amount" },
                    avgPaymentAmount: { $avg: "$amount" },
                    completedPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    failedPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
                    },
                    refundedPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] }
                    }
                }
            }
        ]);

        const paymentMethods = await Payment.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 },
                    revenue: { $sum: "$amount" }
                }
            }
        ]);

        const monthlyStats = await Payment.aggregate([
            {
                $match: { status: "completed" }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    payments: { $sum: 1 },
                    revenue: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        const fraudStats = await Payment.aggregate([
            {
                $group: {
                    _id: "$fraudAnalysis.recommendation",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            message: "Payment analytics retrieved successfully",
            analytics: analytics[0] || {
                totalPayments: 0,
                totalRevenue: 0,
                avgPaymentAmount: 0,
                completedPayments: 0,
                failedPayments: 0,
                refundedPayments: 0
            },
            paymentMethods: paymentMethods,
            monthlyStats: monthlyStats,
            fraudStats: fraudStats
        });

    } catch (err) {
        console.error("Payment analytics error:", err);
        res.status(500).json({
            message: "Failed to retrieve payment analytics",
            error: err.message
        });
    }
}

// Helper functions
async function performFraudAnalysis(order, paymentMethod, req) {
    let riskScore = 0;
    const riskFactors = [];

    // Amount-based risk
    if (order.totalAmount > 50000) {
        riskScore += 20;
        riskFactors.push("High transaction amount");
    }

    // New customer risk
    if (order.customerId && order.customerId.includes("CUST000")) {
        riskScore += 15;
        riskFactors.push("New customer account");
    }

    // Payment method risk
    if (paymentMethod === 'card') {
        riskScore += 5;
    } else if (paymentMethod === 'crypto') {
        riskScore += 25;
        riskFactors.push("Cryptocurrency payment");
    }

    // Time-based risk (late night transactions)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
        riskScore += 10;
        riskFactors.push("Off-hours transaction");
    }

    // Determine recommendation
    let recommendation = 'approve';
    if (riskScore >= 50) {
        recommendation = 'decline';
    } else if (riskScore >= 30) {
        recommendation = 'review';
    }

    return {
        riskScore: Math.min(riskScore, 100),
        riskFactors,
        recommendation,
        analysis: {
            velocityCheck: riskScore < 30,
            geolocationCheck: true,
            deviceFingerprintCheck: riskScore < 40,
            behaviorAnalysis: riskScore < 35
        }
    };
}

async function processWithPaymentGateway(paymentData) {
    // Simulate payment gateway processing
    const { paymentGateway, amount, cardDetails } = paymentData;
    
    // Random success/failure for demo
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
        success: success,
        transactionId: success ? `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}` : null,
        status: success ? "completed" : "failed",
        message: success ? "Payment processed successfully" : "Payment declined by issuer",
        error: success ? null : "Insufficient funds",
        gatewayFee: calculateGatewayFee(amount, paymentGateway),
        processingTime: Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
    };
}

async function processRefundWithGateway(refundData) {
    // Simulate refund processing
    const success = Math.random() > 0.05; // 95% success rate for refunds
    
    return {
        success: success,
        refundId: success ? `REF_${Date.now()}_${Math.random().toString(36).substr(2, 8)}` : null,
        status: success ? "completed" : "failed",
        message: success ? "Refund processed successfully" : "Refund failed",
        processingTime: Math.floor(Math.random() * 72) + 24 // 24-96 hours
    };
}

function calculatePaymentFees(amount, gateway, method) {
    let platformFeeRate = 0.025; // 2.5%
    let gatewayFeeRate = 0.029; // 2.9%
    
    if (method === 'bank_transfer') {
        gatewayFeeRate = 0.01; // 1%
    } else if (method === 'crypto') {
        gatewayFeeRate = 0.015; // 1.5%
    }
    
    const platformFee = amount * platformFeeRate;
    const gatewayFee = amount * gatewayFeeRate;
    
    return {
        platformFee: parseFloat(platformFee.toFixed(2)),
        paymentGatewayFee: parseFloat(gatewayFee.toFixed(2)),
        totalFees: parseFloat((platformFee + gatewayFee).toFixed(2))
    };
}

function calculateGatewayFee(amount, gateway) {
    const rates = {
        'stripe': 0.029,
        'paypal': 0.034,
        'razorpay': 0.02,
        'local_bank': 0.01,
        'crypto_gateway': 0.015
    };
    
    return parseFloat((amount * (rates[gateway] || 0.029)).toFixed(2));
}

function detectCardBrand(cardNumber) {
    const firstDigit = cardNumber.charAt(0);
    const firstTwoDigits = cardNumber.substring(0, 2);
    
    if (firstDigit === '4') return 'Visa';
    if (firstTwoDigits >= '51' && firstTwoDigits <= '55') return 'MasterCard';
    if (firstTwoDigits === '34' || firstTwoDigits === '37') return 'American Express';
    if (firstTwoDigits === '60') return 'Discover';
    
    return 'Unknown';
}