import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            "wood", "clay", "metal", "fabric", "leather", 
            "bamboo", "stone", "gems", "dyes", "tools",
            "varnish", "adhesives", "threads", "beads", "other"
        ]
    },
    subcategory: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    specifications: {
        grade: String,
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
            diameter: Number,
            thickness: Number,
            unit: {
                type: String,
                enum: ["mm", "cm", "m", "inch"],
                default: "cm"
            }
        },
        weight: {
            value: Number,
            unit: {
                type: String,
                enum: ["g", "kg", "lb"],
                default: "kg"
            }
        },
        color: [String],
        texture: String,
        hardness: String,
        durability: {
            type: String,
            enum: ["low", "medium", "high", "very_high"],
            default: "medium"
        }
    },
    pricing: {
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        unit: {
            type: String,
            required: true,
            enum: ["piece", "kg", "meter", "liter", "sheet", "roll", "bundle"]
        },
        currency: {
            type: String,
            default: "LKR"
        },
        minimumOrderQuantity: {
            type: Number,
            default: 1
        },
        bulkPricing: [{
            quantity: Number,
            pricePerUnit: Number,
            discountPercentage: Number
        }]
    },
    inventory: {
        currentStock: {
            type: Number,
            required: true,
            min: 0
        },
        reservedStock: {
            type: Number,
            default: 0
        },
        reorderLevel: {
            type: Number,
            default: 10
        },
        maxStockLevel: {
            type: Number,
            default: 1000
        },
        lastRestockDate: Date,
        nextRestockDate: Date
    },
    quality: {
        qualityGrade: {
            type: String,
            enum: ["premium", "standard", "economy"],
            default: "standard"
        },
        qualityScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 75
        },
        certifications: [{
            name: String,
            certifyingBody: String,
            certificateNumber: String,
            issuedDate: Date,
            expiryDate: Date
        }],
        qualityTests: [{
            testType: String,
            testDate: Date,
            result: String,
            passFail: {
                type: String,
                enum: ["pass", "fail", "conditional"],
                required: true
            }
        }]
    },
    sustainability: {
        isEcoFriendly: {
            type: Boolean,
            default: false
        },
        sustainabilityRating: {
            type: String,
            enum: ["A", "B", "C", "D", "E"]
        },
        sourceLocation: {
            region: String,
            country: {
                type: String,
                default: "Sri Lanka"
            },
            isLocal: {
                type: Boolean,
                default: true
            }
        },
        carbonFootprint: {
            value: Number,
            unit: {
                type: String,
                enum: ["kg_co2", "tonnes_co2"],
                default: "kg_co2"
            }
        },
        recyclable: {
            type: Boolean,
            default: false
        },
        biodegradable: {
            type: Boolean,
            default: false
        }
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        altText: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    compatibleCrafts: [{
        type: String,
        enum: [
            "wood_carving", "pottery", "batik", "jewelry", 
            "textiles", "metalwork", "leather_craft", 
            "bamboo_craft", "stone_carving", "masks", 
            "traditional_painting"
        ]
    }],
    seasonality: {
        isSeasonallyAvailable: {
            type: Boolean,
            default: false
        },
        availableMonths: [{
            type: String,
            enum: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
        }],
        peakSeason: {
            start: String, // month
            end: String    // month
        }
    },
    demandForecasting: {
        predictedDemand: [{
            month: String,
            year: Number,
            estimatedQuantity: Number,
            confidence: {
                type: Number,
                min: 0,
                max: 100
            }
        }],
        trendingScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        lastDemandUpdate: Date
    },
    usage: {
        totalOrdered: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        popularityScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        lastOrderDate: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
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

// Indexes
materialSchema.index({ supplier: 1 });
materialSchema.index({ category: 1 });
materialSchema.index({ "pricing.unitPrice": 1 });
materialSchema.index({ "quality.qualityScore": -1 });
materialSchema.index({ "sustainability.isEcoFriendly": 1 });
materialSchema.index({ isActive: 1, isAvailable: 1 });

// Text search index
materialSchema.index({
    name: "text",
    description: "text",
    subcategory: "text"
});

// Virtual for available stock
materialSchema.virtual("availableStock").get(function() {
    return this.inventory.currentStock - this.inventory.reservedStock;
});

// Check stock availability
materialSchema.methods.checkAvailability = function(requestedQuantity) {
    return this.availableStock >= requestedQuantity && 
           requestedQuantity >= this.pricing.minimumOrderQuantity;
};

// Reserve stock
materialSchema.methods.reserveStock = async function(quantity) {
    if (this.checkAvailability(quantity)) {
        this.inventory.reservedStock += quantity;
        await this.save();
        return true;
    }
    return false;
};

// Complete order (reduce stock)
materialSchema.methods.completeOrder = async function(quantity) {
    this.inventory.currentStock -= quantity;
    this.inventory.reservedStock -= quantity;
    this.usage.totalOrdered += quantity;
    this.usage.totalRevenue += this.pricing.unitPrice * quantity;
    this.usage.lastOrderDate = new Date();
    
    // Check if reorder is needed
    if (this.inventory.currentStock <= this.inventory.reorderLevel) {
        this.isAvailable = false;
        // Could trigger reorder notification here
    }
    
    await this.save();
};

// Calculate bulk price
materialSchema.methods.calculatePrice = function(quantity) {
    let pricePerUnit = this.pricing.unitPrice;
    
    // Check bulk pricing
    for (let bulk of this.pricing.bulkPricing) {
        if (quantity >= bulk.quantity) {
            pricePerUnit = bulk.pricePerUnit || 
                          (this.pricing.unitPrice * (1 - bulk.discountPercentage / 100));
        }
    }
    
    return pricePerUnit * quantity;
};

// Update demand forecasting
materialSchema.methods.updateDemandForecast = async function() {
    // This would integrate with AI forecasting system
    // For now, simple calculation based on recent orders
    const MaterialOrder = mongoose.model("MaterialOrder");
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentOrders = await MaterialOrder.find({
        material: this._id,
        orderDate: { $gte: threeMonthsAgo },
        status: "delivered"
    });
    
    const totalRecentQuantity = recentOrders.reduce((sum, order) => sum + order.quantity, 0);
    const avgMonthlyDemand = totalRecentQuantity / 3;
    
    // Simple trending calculation
    this.demandForecasting.trendingScore = Math.min(100, avgMonthlyDemand * 10);
    this.demandForecasting.lastDemandUpdate = new Date();
    
    await this.save();
};

const Material = mongoose.model("Material", materialSchema);

export default Material;