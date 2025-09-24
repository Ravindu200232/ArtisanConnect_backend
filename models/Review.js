import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    reviewType: {
        type: String,
        enum: ["product", "artisan", "tourism_package", "supplier"],
        required: true
    },
    // Reference to the reviewed entity
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    },
    artisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artisan"
    },
    tourismPackage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TourismPackage"
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier"
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order" // Link to the order for product/artisan reviews
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TourismBooking" // Link to booking for tourism reviews
    },
    rating: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        // Aspect-specific ratings based on review type
        aspectRatings: {
            // For product reviews
            quality: {
                type: Number,
                min: 1,
                max: 5
            },
            craftsmanship: {
                type: Number,
                min: 1,
                max: 5
            },
            valueForMoney: {
                type: Number,
                min: 1,
                max: 5
            },
            packaging: {
                type: Number,
                min: 1,
                max: 5
            },
            // For artisan reviews
            communication: {
                type: Number,
                min: 1,
                max: 5
            },
            professionalism: {
                type: Number,
                min: 1,
                max: 5
            },
            timeliness: {
                type: Number,
                min: 1,
                max: 5
            },
            // For tourism reviews
            guide: {
                type: Number,
                min: 1,
                max: 5
            },
            experience: {
                type: Number,
                min: 1,
                max: 5
            },
            organization: {
                type: Number,
                min: 1,
                max: 5
            },
            // For supplier reviews
            materialQuality: {
                type: Number,
                min: 1,
                max: 5
            },
            delivery: {
                type: Number,
                min: 1,
                max: 5
            },
            service: {
                type: Number,
                min: 1,
                max: 5
            }
        }
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    pros: [{
        type: String,
        maxlength: 200
    }],
    cons: [{
        type: String,
        maxlength: 200
    }],
    images: [{
        url: {
            type: String,
            required: true
        },
        caption: String
    }],
    // Verification details
    verification: {
        isVerifiedPurchase: {
            type: Boolean,
            default: false
        },
        purchaseDate: Date,
        verificationDate: Date
    },
    // Response from the reviewed entity
    response: {
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "response.responderType"
        },
        responderType: {
            type: String,
            enum: ["Artisan", "TourismProvider", "Supplier"]
        },
        responseText: {
            type: String,
            maxlength: 500
        },
        responseDate: Date
    },
    // Helpfulness voting
    helpfulness: {
        helpful: {
            type: Number,
            default: 0
        },
        notHelpful: {
            type: Number,
            default: 0
        },
        voters: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            vote: {
                type: String,
                enum: ["helpful", "not_helpful"]
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    // Review status and moderation
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "flagged"],
        default: "pending"
    },
    moderationNotes: String,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    moderatedAt: Date,
    // Flags for inappropriate content
    flags: [{
        flaggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reason: {
            type: String,
            enum: ["spam", "inappropriate", "fake", "offensive", "irrelevant"],
            required: true
        },
        description: String,
        flaggedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Cultural context for international reviewers
    reviewerContext: {
        country: String,
        isInternational: {
            type: Boolean,
            default: false
        },
        culturalBackground: String,
        visitPurpose: {
            type: String,
            enum: ["tourism", "business", "education", "personal"]
        }
    },
    isVisible: {
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
reviewSchema.index({ reviewType: 1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ artisan: 1 });
reviewSchema.index({ tourismPackage: 1 });
reviewSchema.index({ supplier: 1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ "rating.overall": -1 });
reviewSchema.index({ status: 1, isVisible: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for approved, visible reviews
reviewSchema.index({ status: 1, isVisible: 1, "rating.overall": -1 });

// Text search index
reviewSchema.index({
    title: "text",
    comment: "text"
});

// Virtual for helpfulness score
reviewSchema.virtual("helpfulnessScore").get(function() {
    const total = this.helpfulness.helpful + this.helpfulness.notHelpful;
    if (total === 0) return 0;
    return (this.helpfulness.helpful / total) * 100;
});

// Method to add helpfulness vote
reviewSchema.methods.addHelpfulnessVote = async function(userId, vote) {
    // Check if user has already voted
    const existingVote = this.helpfulness.voters.find(
        voter => voter.user.toString() === userId.toString()
    );
    
    if (existingVote) {
        // Update existing vote
        if (existingVote.vote === "helpful") {
            this.helpfulness.helpful--;
        } else {
            this.helpfulness.notHelpful--;
        }
        
        existingVote.vote = vote;
        existingVote.votedAt = new Date();
    } else {
        // Add new vote
        this.helpfulness.voters.push({
            user: userId,
            vote: vote
        });
    }
    
    // Update counts
    if (vote === "helpful") {
        this.helpfulness.helpful++;
    } else {
        this.helpfulness.notHelpful++;
    }
    
    await this.save();
};

// Method to flag review
reviewSchema.methods.flagReview = async function(userId, reason, description) {
    this.flags.push({
        flaggedBy: userId,
        reason: reason,
        description: description
    });
    
    // Auto-flag for review if flagged multiple times
    if (this.flags.length >= 3) {
        this.status = "flagged";
    }
    
    await this.save();
};

// Method to respond to review
reviewSchema.methods.addResponse = async function(responderId, responderType, responseText) {
    this.response = {
        respondedBy: responderId,
        responderType: responderType,
        responseText: responseText,
        responseDate: new Date()
    };
    
    await this.save();
};

// Static method to get review statistics
reviewSchema.statics.getReviewStats = async function(entityId, entityType) {
    const matchCondition = {};
    matchCondition[entityType.toLowerCase()] = entityId;
    matchCondition.status = "approved";
    matchCondition.isVisible = true;
    
    const stats = await this.aggregate([
        { $match: matchCondition },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating.overall" },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: "$rating.overall"
                }
            }
        },
        {
            $addFields: {
                ratingCounts: {
                    "5": {
                        $size: {
                            $filter: {
                                input: "$ratingDistribution",
                                cond: { $eq: ["$$this", 5] }
                            }
                        }
                    },
                    "4": {
                        $size: {
                            $filter: {
                                input: "$ratingDistribution",
                                cond: { $eq: ["$$this", 4] }
                            }
                        }
                    },
                    "3": {
                        $size: {
                            $filter: {
                                input: "$ratingDistribution",
                                cond: { $eq: ["$$this", 3] }
                            }
                        }
                    },
                    "2": {
                        $size: {
                            $filter: {
                                input: "$ratingDistribution",
                                cond: { $eq: ["$$this", 2] }
                            }
                        }
                    },
                    "1": {
                        $size: {
                            $filter: {
                                input: "$ratingDistribution",
                                cond: { $eq: ["$$this", 1] }
                            }
                        }
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingCounts: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
    };
};

// Pre-save middleware to validate review type consistency
reviewSchema.pre("save", function(next) {
    const reviewTypeFields = {
        "product": "product",
        "artisan": "artisan",
        "tourism_package": "tourismPackage",
        "supplier": "supplier"
    };
    
    const expectedField = reviewTypeFields[this.reviewType];
    if (!this[expectedField]) {
        return next(new Error(`${expectedField} field is required for ${this.reviewType} review`));
    }
    
    // Clear other fields
    Object.values(reviewTypeFields).forEach(field => {
        if (field !== expectedField) {
            this[field] = undefined;
        }
    });
    
    next();
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;