import mongoose from "mongoose";
import User from "./User.js";

const supplierSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    businessRegistrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    materialSpecialties: [{
        type: String,
        required: true,
        enum: [
            "wood", "clay", "metal", "fabric", "leather", 
            "bamboo", "stone", "gems", "dyes", "tools",
            "varnish", "adhesives", "threads", "beads"
        ]
    }],
    certifications: [{
        type: {
            type: String,
            enum: ["quality", "organic", "sustainable", "fair_trade", "eco_friendly"],
            required: true
        },
        certificationBody: String,
        certificateNumber: String,
        issuedDate: Date,
        expiryDate: Date,
        documentUrl: String
    }],
    warehouse: {
        address: {
            street: String,
            city: String,
            province: String,
            country: {
                type: String,
                default: "Sri Lanka"
            },
            postalCode: String
        },
        capacity: {
            type: Number, // in cubic meters or relevant unit
            default: 0
        },
        facilities: [{
            type: String,
            enum: ["climate_controlled", "security", "loading_dock", "quality_lab"]
        }]
    },
    businessInfo: {
        establishedYear: Number,
        employeeCount: {
            type: Number,
            default: 1
        },
        annualTurnover: Number,
        website: String,
        socialMedia: {
            facebook: String,
            linkedin: String
        }
    },
    paymentTerms: {
        acceptedMethods: [{
            type: String,
            enum: ["bank_transfer", "check", "cash", "credit"],
            default: "bank_transfer"
        }],
        creditPeriod: {
            type: Number, // in days
            default: 30
        },
        minimumOrderValue: {
            type: Number,
            default: 0
        },
        bulkDiscounts: [{
            quantity: Number,
            discountPercentage: Number
        }]
    },
    delivery: {
        methods: [{
            type: String,
            enum: ["pickup", "local_delivery", "courier", "shipping"],
            default: "pickup"
        }],
        coverageAreas: [{
            province: String,
            deliveryTime: String, // e.g., "2-3 days"
            cost: Number
        }],
        freeDeliveryThreshold: {
            type: Number,
            default: 0
        }
    },
    rating: {
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        qualityRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        deliveryRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        serviceRating: {
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
    performance: {
        totalOrders: {
            type: Number,
            default: 0
        },
        completedOrders: {
            type: Number,
            default: 0
        },
        averageDeliveryTime: {
            type: Number, // in days
            default: 0
        },
        onTimeDeliveryRate: {
            type: Number, // percentage
            default: 0
        }
    },
    sustainability: {
        ecoFriendlyMaterials: {
            type: Boolean,
            default: false
        },
        sustainableSourcing: {
            type: Boolean,
            default: false
        },
        carbonFootprint: {
            measured: {
                type: Boolean,
                default: false
            },
            rating: {
                type: String,
                enum: ["A", "B", "C", "D", "E"]
            }
        },
        wasteManagement: {
            recycling: {
                type: Boolean,
                default: false
            },
            composting: {
                type: Boolean,
                default: false
            }
        }
    },
    contractedArtisans: [{
        artisan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Artisan"
        },
        contractStartDate: Date,
        preferredMaterials: [String],
        volumeDiscount: {
            type: Number,
            default: 0
        }
    }],
    bankDetails: {
        bankName: String,
        accountNumber: String,
        branchCode: String,
        accountHolderName: String,
        swiftCode: String // for international transactions
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDocuments: [{
        type: {
            type: String,
            enum: ["business_registration", "tax_certificate", "quality_certificate", "address_proof"],
            required: true
        },
        documentUrl: String,
        uploadedDate: {
            type: Date,
            default: Date.now
        },
        verifiedDate: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }]
});

// Update performance metrics
supplierSchema.methods.updatePerformance = async function() {
    const MaterialOrder = mongoose.model("MaterialOrder"); // To be created
    
    const stats = await MaterialOrder.aggregate([
        { $match: { supplier: this._id } },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                completedOrders: {
                    $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                },
                avgDeliveryTime: {
                    $avg: {
                        $divide: [
                            { $subtract: ["$deliveredDate", "$orderDate"] },
                            86400000 // Convert to days
                        ]
                    }
                }
            }
        }
    ]);

    if (stats.length > 0) {
        this.performance.totalOrders = stats[0].totalOrders;
        this.performance.completedOrders = stats[0].completedOrders;
        this.performance.averageDeliveryTime = Math.round(stats[0].avgDeliveryTime || 0);
        this.performance.onTimeDeliveryRate = 
            (this.performance.completedOrders / this.performance.totalOrders) * 100;
    }
    
    await this.save();
};

// Calculate bulk discount
supplierSchema.methods.calculateBulkDiscount = function(quantity) {
    let discount = 0;
    for (let bulkDiscount of this.paymentTerms.bulkDiscounts) {
        if (quantity >= bulkDiscount.quantity) {
            discount = Math.max(discount, bulkDiscount.discountPercentage);
        }
    }
    return discount;
};

const Supplier = User.discriminator("supplier", supplierSchema);

export default Supplier;