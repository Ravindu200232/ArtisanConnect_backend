import mongoose from "mongoose";
import User from "./User.js";

const customerSchema = new mongoose.Schema({
    preferences: {
        craftTypes: [{
            type: String,
            enum: [
                "wood_carving", 
                "pottery", 
                "batik", 
                "jewelry", 
                "textiles", 
                "metalwork", 
                "leather_craft", 
                "bamboo_craft", 
                "stone_carving", 
                "masks", 
                "traditional_painting"
            ]
        }],
        priceRange: {
            min: {
                type: Number,
                default: 0
            },
            max: {
                type: Number,
                default: 50000
            }
        },
        preferredRegions: [{
            type: String,
            enum: [
                "western", "central", "southern", "northern", 
                "eastern", "north_western", "north_central", 
                "uva", "sabaragamuwa"
            ]
        }]
    },
    wishlist: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        addedDate: {
            type: Date,
            default: Date.now
        }
    }],
    shippingAddresses: [{
        label: {
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
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    paymentMethods: [{
        type: {
            type: String,
            enum: ["card", "bank_transfer", "mobile_payment"],
            required: true
        },
        provider: String, // Visa, Mastercard, etc.
        lastFourDigits: String,
        isDefault: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    culturalInterests: {
        type: [String],
        enum: [
            "traditional_music", "dance", "festivals", "food", 
            "architecture", "literature", "folklore", "religion"
        ]
    },
    tourismHistory: [{
        package: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TourismPackage"
        },
        bookedDate: Date,
        completedDate: Date,
        rating: {
            type: Number,
            min: 1,
            max: 5
        }
    }],
    loyalty: {
        points: {
            type: Number,
            default: 0
        },
        tier: {
            type: String,
            enum: ["bronze", "silver", "gold", "platinum"],
            default: "bronze"
        }
    },
    statistics: {
        totalOrders: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        averageOrderValue: {
            type: Number,
            default: 0
        },
        favoriteArtisan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Artisan"
        }
    },
    communicationPreferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        marketingEmails: {
            type: Boolean,
            default: false
        }
    }
});

// Update loyalty tier based on total spent
customerSchema.methods.updateLoyaltyTier = function() {
    const totalSpent = this.statistics.totalSpent;
    
    if (totalSpent >= 100000) {
        this.loyalty.tier = "platinum";
    } else if (totalSpent >= 50000) {
        this.loyalty.tier = "gold";
    } else if (totalSpent >= 25000) {
        this.loyalty.tier = "silver";
    } else {
        this.loyalty.tier = "bronze";
    }
};

// Add points based on purchase
customerSchema.methods.addLoyaltyPoints = function(orderAmount) {
    const pointsEarned = Math.floor(orderAmount / 100); // 1 point per 100 LKR
    this.loyalty.points += pointsEarned;
};

// Calculate average order value
customerSchema.methods.updateStatistics = async function() {
    const Order = mongoose.model("Order");
    const stats = await Order.aggregate([
        { $match: { customer: this._id, status: "completed" } },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: "$totalAmount" },
                avgOrderValue: { $avg: "$totalAmount" }
            }
        }
    ]);

    if (stats.length > 0) {
        this.statistics.totalOrders = stats[0].totalOrders;
        this.statistics.totalSpent = stats[0].totalSpent;
        this.statistics.averageOrderValue = Math.round(stats[0].avgOrderValue);
        this.updateLoyaltyTier();
    }
    
    await this.save();
};

const Customer = User.discriminator("customer", customerSchema);

export default Customer;