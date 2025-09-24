import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        artisan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Artisan",
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
        customization: {
            isCustomized: {
                type: Boolean,
                default: false
            },
            customOptions: [{
                name: String,
                selectedOption: String,
                additionalCost: {
                    type: Number,
                    default: 0
                }
            }],
            customInstructions: String
        },
        status: {
            type: String,
            enum: [
                "pending", "confirmed", "crafting", "ready", 
                "shipped", "delivered", "cancelled"
            ],
            default: "pending"
        }
    }],
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        shippingCost: {
            type: Number,
            default: 0
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        discountAmount: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    discounts: [{
        type: {
            type: String,
            enum: ["coupon", "loyalty", "bulk", "seasonal"],
            required: true
        },
        code: String,
        amount: {
            type: Number,
            required: true
        },
        description: String
    }],
    shippingAddress: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        province: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: "Sri Lanka"
        },
        postalCode: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        }
    },
    billingAddress: {
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        province: String,
        country: {
            type: String,
            default: "Sri Lanka"
        },
        postalCode: String,
        phoneNumber: String,
        sameAsShipping: {
            type: Boolean,
            default: true
        }
    },
    payment: {
        method: {
            type: String,
            enum: ["card", "bank_transfer", "cash_on_delivery", "mobile_payment"],
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed", "refunded"],
            default: "pending"
        },
        transactionId: String,
        paymentDate: Date,
        paymentDetails: {
            cardLast4: String,
            bankName: String,
            referenceNumber: String
        }
    },
    shipping: {
        method: {
            type: String,
            enum: ["standard", "express", "pickup", "international"],
            required: true
        },
        trackingNumber: String,
        carrier: String,
        estimatedDelivery: Date,
        actualDelivery: Date,
        shippingDate: Date,
        deliveryInstructions: String
    },
    status: {
        type: String,
        enum: [
            "pending_payment", "payment_processing", "paid", "confirmed", 
            "processing", "shipped", "delivered", "completed", 
            "cancelled", "refunded"
        ],
        default: "pending_payment"
    },
    timeline: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "timeline.updatedByModel"
        },
        updatedByModel: {
            type: String,
            enum: ["Customer", "Artisan", "Admin"]
        }
    }],
    notes: {
        customerNotes: String,
        internalNotes: String
    },
    estimatedCompletionDate: Date,
    actualCompletionDate: Date,
    cancellation: {
        isCancelled: {
            type: Boolean,
            default: false
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "cancellation.cancelledByModel"
        },
        cancelledByModel: {
            type: String,
            enum: ["Customer", "Artisan", "Admin"]
        },
        cancelledAt: Date,
        reason: String,
        refundStatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending"
        }
    },
    reviews: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        review: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate unique order number
orderSchema.pre("save", async function(next) {
    if (!this.orderNumber) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        
        // Count orders for today to create unique number
        const todayStart = new Date(year, now.getMonth(), now.getDate());
        const todayEnd = new Date(year, now.getMonth(), now.getDate() + 1);
        
        const todayOrderCount = await mongoose.model("Order").countDocuments({
            createdAt: { $gte: todayStart, $lt: todayEnd }
        });
        
        const orderNumber = `AC${year}${month}${day}${String(todayOrderCount + 1).padStart(4, "0")}`;
        this.orderNumber = orderNumber;
    }
    
    next();
});

// Calculate totals
orderSchema.methods.calculateTotals = function() {
    this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.pricing.totalAmount = this.pricing.subtotal + 
                              this.pricing.shippingCost + 
                              this.pricing.taxAmount - 
                              this.pricing.discountAmount;
};

// Add status to timeline
orderSchema.methods.addStatusUpdate = function(status, note, updatedBy, updatedByModel) {
    this.status = status;
    this.timeline.push({
        status,
        note,
        updatedBy,
        updatedByModel,
        timestamp: new Date()
    });
};

// Check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
    const nonCancellableStatuses = ["shipped", "delivered", "completed", "cancelled", "refunded"];
    return !nonCancellableStatuses.includes(this.status);
};

// Get artisans from order items
orderSchema.methods.getArtisans = function() {
    return [...new Set(this.items.map(item => item.artisan.toString()))];
};

// Calculate estimated completion date based on items
orderSchema.methods.calculateEstimatedCompletion = async function() {
    const Product = mongoose.model("Product");
    let maxDays = 0;
    
    for (let item of this.items) {
        const product = await Product.findById(item.product);
        if (product && product.craftingDetails.timeToCraft) {
            // Parse time to craft (e.g., "2-3 weeks" -> 21 days)
            const timeString = product.craftingDetails.timeToCraft.toLowerCase();
            let days = 7; // default
            
            if (timeString.includes("week")) {
                const weeks = parseInt(timeString.match(/\d+/)[0]) || 1;
                days = weeks * 7;
            } else if (timeString.includes("day")) {
                days = parseInt(timeString.match(/\d+/)[0]) || 7;
            }
            
            if (item.customization.isCustomized) {
                days += 7; // Add extra time for customization
            }
            
            maxDays = Math.max(maxDays, days);
        }
    }
    
    this.estimatedCompletionDate = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);
};

// Indexes
orderSchema.index({ customer: 1 });
orderSchema.index({ "items.artisan": 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;