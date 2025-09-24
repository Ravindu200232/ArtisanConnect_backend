import mongoose from "mongoose";
import User from "./User.js";

const artisanSchema = new mongoose.Schema({
    craftSpecialty: {
        type: [String],
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
            "other"
        ]
    },
    experience: {
        type: Number,
        required: true,
        min: 0
    },
    workshopLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        district: String
    },
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        certificateUrl: String
    }],
    skills: [{
        skill: String,
        level: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", "expert"],
            default: "beginner"
        }
    }],
    businessInfo: {
        businessName: String,
        businessRegistrationNumber: String,
        businessType: {
            type: String,
            enum: ["individual", "family_business", "cooperative", "company"],
            default: "individual"
        },
        taxId: String
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        branchCode: String,
        accountHolderName: String
    },
    socialMedia: {
        facebook: String,
        instagram: String,
        website: String
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
    totalSales: {
        type: Number,
        default: 0
    },
    totalProducts: {
        type: Number,
        default: 0
    },
    isAvailableForCustomOrders: {
        type: Boolean,
        default: true
    },
    preferredLanguages: {
        type: [String],
        enum: ["sinhala", "tamil", "english"],
        default: ["sinhala"]
    },
    culturalStory: {
        type: String,
        maxlength: 1000
    }
});

// Calculate total products
artisanSchema.methods.updateProductCount = async function() {
    const Product = mongoose.model("Product");
    const count = await Product.countDocuments({ artisan: this._id, isActive: true });
    this.totalProducts = count;
    await this.save();
};

// Calculate average rating
artisanSchema.methods.updateRating = async function() {
    const Review = mongoose.model("Review");
    const stats = await Review.aggregate([
        { $match: { artisan: this._id } },
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

const Artisan = User.discriminator("artisan", artisanSchema);

export default Artisan;