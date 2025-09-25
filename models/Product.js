import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    category: {
        type: String,
        required: true,
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
            "traditional_painting",
            "decorative_items",
            "functional_items"
        ]
    },
    subcategory: {
        type: String,
        required: true
    },
    artisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "artisan",
        required: true
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
        },
        qualityScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        } // AI Photo Quality Checker score
    }],
    arModel: {
        modelUrl: String,
        previewUrl: String,
        isAvailable: {
            type: Boolean,
            default: false
        }
    },
    pricing: {
        basePrice: {
            type: Number,
            required: true,
            min: 0
        },
        discountedPrice: {
            type: Number,
            min: 0
        },
        currency: {
            type: String,
            default: "LKR"
        }
    },
    inventory: {
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        reservedQuantity: {
            type: Number,
            default: 0
        },
        lowStockThreshold: {
            type: Number,
            default: 5
        }
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        weight: Number,
        unit: {
            type: String,
            enum: ["cm", "mm", "m"],
            default: "cm"
        }
    },
    materials: [{
        name: {
            type: String,
            required: true
        },
        quantity: String,
        sustainabilityRating: {
            type: String,
            enum: ["eco-friendly", "sustainable", "traditional", "mixed"],
            default: "traditional"
        }
    }],
    craftingDetails: {
        techniqueUsed: {
            type: [String],
            required: true
        },
        timeToCraft: {
            type: String, // e.g., "2-3 weeks"
            required: true
        },
        skillLevel: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", "master"],
            required: true
        },
        culturalSignificance: {
            type: String,
            maxlength: 500
        }
    },
    customization: {
        isCustomizable: {
            type: Boolean,
            default: false
        },
        customOptions: [{
            name: String,
            options: [String],
            additionalCost: {
                type: Number,
                default: 0
            }
        }],
        customizationTimeAdd: String // Additional time for customization
    },
    shipping: {
        weight: {
            type: Number,
            required: false
        },
        dimensions: {
            length: Number,
            width: Number,
            height: Number
        },
        fragile: {
            type: Boolean,
            default: false
        },
        shippingCost: {
            local: {
                type: Number,
                default: 0
            },
            international: {
                type: Number,
                default: 0
            }
        }
    },
    seo: {
        tags: {
            type: [String],
            index: true
        },
        metaDescription: String,
        searchKeywords: [String]
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        }
    },
    sales: {
        totalSold: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        lastSaleDate: Date
    },
    status: {
        type: String,
        enum: ["draft", "active", "out_of_stock", "discontinued"],
        default: "draft"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
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

// Indexes for better query performance
productSchema.index({ artisan: 1 });
productSchema.index({ category: 1 });
productSchema.index({ "pricing.basePrice": 1 });
productSchema.index({ "rating.average": -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ "seo.tags": 1 });

// Text index for search functionality
productSchema.index({
    name: "text",
    description: "text",
    "seo.tags": "text",
    "seo.searchKeywords": "text"
});

// Virtual for available quantity
productSchema.virtual("availableQuantity").get(function() {
    return this.inventory.quantity - this.inventory.reservedQuantity;
});

// Check if product is in stock
productSchema.methods.isInStock = function(requestedQuantity = 1) {
    return this.availableQuantity >= requestedQuantity;
};

// Reserve inventory
productSchema.methods.reserveInventory = async function(quantity) {
    if (this.isInStock(quantity)) {
        this.inventory.reservedQuantity += quantity;
        await this.save();
        return true;
    }
    return false;
};

// Complete sale (move from reserved to sold)
productSchema.methods.completeSale = async function(quantity) {
    this.inventory.quantity -= quantity;
    this.inventory.reservedQuantity -= quantity;
    this.sales.totalSold += quantity;
    this.sales.totalRevenue += (this.pricing.discountedPrice || this.pricing.basePrice) * quantity;
    this.sales.lastSaleDate = new Date();
    
    // Update status if out of stock
    if (this.inventory.quantity === 0) {
        this.status = "out_of_stock";
    }
    
    await this.save();
};

// Release reserved inventory
productSchema.methods.releaseReservedInventory = async function(quantity) {
    this.inventory.reservedQuantity = Math.max(0, this.inventory.reservedQuantity - quantity);
    await this.save();
};

// Update rating
productSchema.methods.updateRating = async function() {
    const Review = mongoose.model("Review");
    const stats = await Review.aggregate([
        { $match: { product: this._id } },
        {
            $group: {
                _id: null,
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        this.rating.average = Math.round(stats[0].avgRating * 10) / 10;
        this.rating.totalReviews = stats[0].totalReviews;
    } else {
        this.rating.average = 0;
        this.rating.totalReviews = 0;
    }
    
    await this.save();
};

const Product = mongoose.model("Product", productSchema);

export default Product;