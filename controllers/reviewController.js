import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Artisan from "../models/Artisan.js";
import Order from "../models/Order.js";
import { TourismPackage } from "../models/Tourism.js";
import mongoose from "mongoose";

// Create Review
export const createReview = async (req, res) => {
    try {
        const {
            reviewType,
            product,
            artisan,
            tourismPackage,
            supplier,
            order,
            booking,
            rating,
            title,
            comment,
            pros,
            cons,
            images,
            reviewerContext
        } = req.body;

        // Validate review type and corresponding entity
        const entityField = {
            "product": product,
            "artisan": artisan,
            "tourism_package": tourismPackage,
            "supplier": supplier
        }[reviewType];

        if (!entityField) {
            return res.status(400).json({
                success: false,
                error: `${reviewType} ID is required for ${reviewType} review`,
                code: "MISSING_ENTITY_ID"
            });
        }

        // Check if user has purchased/used the product/service (optional verification)
        let verificationData = {
            isVerifiedPurchase: false
        };

        if (order && reviewType === "product") {
            const orderRecord = await Order.findOne({
                _id: order,
                customer: req.user._id,
                status: "completed",
                "items.product": product
            });

            if (orderRecord) {
                verificationData = {
                    isVerifiedPurchase: true,
                    purchaseDate: orderRecord.createdAt,
                    verificationDate: new Date()
                };
            }
        }

        // Create review data
        const reviewData = {
            reviewer: req.user._id,
            reviewType,
            rating,
            title,
            comment,
            pros: pros || [],
            cons: cons || [],
            images: images || [],
            verification: verificationData,
            reviewerContext: reviewerContext || {},
            status: "pending" // All reviews start as pending for moderation
        };

        // Add entity-specific field
        reviewData[reviewType === "tourism_package" ? "tourismPackage" : reviewType] = entityField;
        if (order) reviewData.order = order;
        if (booking) reviewData.booking = booking;

        const review = new Review(reviewData);
        await review.save();

        // Populate reviewer information
        await review.populate("reviewer", "firstName lastName");

        res.status(201).json({
            success: true,
            message: "Review submitted successfully and is pending approval",
            data: {
                review
            }
        });

    } catch (error) {
        console.error("Create review error:", error);

        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Reviews by Entity
export const getReviewsByEntity = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const { page = 1, limit = 10, sort = "-createdAt", rating } = req.query;

        if (!["product", "artisan", "tourism_package", "supplier"].includes(entityType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid entity type",
                code: "INVALID_ENTITY_TYPE"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid entity ID",
                code: "INVALID_ID"
            });
        }

        // Build filter
        const filter = {
            reviewType: entityType,
            status: "approved",
            isVisible: true
        };

        const entityField = entityType === "tourism_package" ? "tourismPackage" : entityType;
        filter[entityField] = entityId;

        if (rating) {
            filter["rating.overall"] = parseInt(rating);
        }

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const reviews = await Review.find(filter)
            .populate("reviewer", "firstName lastName")
            .populate("product", "name images")
            .populate("tourismPackage", "title")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalReviews = await Review.countDocuments(filter);

        // Get review statistics
        const reviewStats = await Review.getReviewStats(entityId, entityType);

        res.status(200).json({
            success: true,
            data: {
                reviews,
                statistics: reviewStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalReviews / parseInt(limit)),
                    totalReviews,
                    hasNextPage: parseInt(page) < Math.ceil(totalReviews / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get reviews by entity error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get User's Reviews
export const getUserReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = "-createdAt", status } = req.query;

        // Build filter
        const filter = { reviewer: req.user._id };
        if (status) filter.status = status;

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const reviews = await Review.find(filter)
            .populate("product", "name images artisan")
            .populate("artisan", "firstName lastName businessInfo.businessName")
            .populate("tourismPackage", "title provider")
            .populate("supplier", "companyName firstName lastName")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalReviews = await Review.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalReviews / parseInt(limit)),
                    totalReviews,
                    hasNextPage: parseInt(page) < Math.ceil(totalReviews / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get user reviews error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Review
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid review ID",
                code: "INVALID_ID"
            });
        }

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        // Check if user owns the review
        if (review.reviewer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only update your own reviews",
                code: "ACCESS_DENIED"
            });
        }

        // Only allow certain fields to be updated
        const allowedUpdates = ["rating", "title", "comment", "pros", "cons", "images"];
        const actualUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                actualUpdates[key] = updates[key];
            }
        });

        // Reset status to pending if content is modified
        if (Object.keys(actualUpdates).length > 0) {
            actualUpdates.status = "pending";
            actualUpdates.updatedAt = new Date();
        }

        const updatedReview = await Review.findByIdAndUpdate(
            id,
            actualUpdates,
            { new: true, runValidators: true }
        ).populate("reviewer", "firstName lastName");

        res.status(200).json({
            success: true,
            message: "Review updated successfully and is pending approval",
            data: {
                review: updatedReview
            }
        });

    } catch (error) {
        console.error("Update review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Delete Review
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid review ID",
                code: "INVALID_ID"
            });
        }

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        // Check if user owns the review or is admin
        if (review.reviewer.toString() !== req.user._id.toString() && req.user.userType !== "admin") {
            return res.status(403).json({
                success: false,
                error: "You can only delete your own reviews",
                code: "ACCESS_DENIED"
            });
        }

        await Review.findByIdAndDelete(id);

        // Update entity ratings after review deletion
        await updateEntityRating(review);

        res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });

    } catch (error) {
        console.error("Delete review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Add Helpfulness Vote
export const addHelpfulnessVote = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote } = req.body; // "helpful" or "not_helpful"

        if (!["helpful", "not_helpful"].includes(vote)) {
            return res.status(400).json({
                success: false,
                error: "Vote must be 'helpful' or 'not_helpful'",
                code: "INVALID_VOTE"
            });
        }

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        if (review.reviewer.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: "You cannot vote on your own review",
                code: "CANNOT_VOTE_OWN_REVIEW"
            });
        }

        await review.addHelpfulnessVote(req.user._id, vote);

        res.status(200).json({
            success: true,
            message: "Vote recorded successfully",
            data: {
                helpfulness: {
                    helpful: review.helpfulness.helpful,
                    notHelpful: review.helpfulness.notHelpful,
                    score: review.helpfulnessScore
                }
            }
        });

    } catch (error) {
        console.error("Add helpfulness vote error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Flag Review
export const flagReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, description } = req.body;

        if (!["spam", "inappropriate", "fake", "offensive", "irrelevant"].includes(reason)) {
            return res.status(400).json({
                success: false,
                error: "Invalid flag reason",
                code: "INVALID_FLAG_REASON"
            });
        }

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        if (review.reviewer.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: "You cannot flag your own review",
                code: "CANNOT_FLAG_OWN_REVIEW"
            });
        }

        await review.flagReview(req.user._id, reason, description);

        res.status(200).json({
            success: true,
            message: "Review flagged successfully for moderation"
        });

    } catch (error) {
        console.error("Flag review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Respond to Review (Artisan/Supplier/Tourism Provider only)
export const respondToReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { responseText } = req.body;

        if (!responseText || responseText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Response text is required",
                code: "MISSING_RESPONSE_TEXT"
            });
        }

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        // Check if user can respond to this review
        let canRespond = false;
        let responderType = "";

        if (review.reviewType === "product" || review.reviewType === "artisan") {
            const product = review.product ? await Product.findById(review.product) : null;
            if ((product && product.artisan.toString() === req.user._id.toString()) ||
                (review.artisan && review.artisan.toString() === req.user._id.toString())) {
                canRespond = true;
                responderType = "Artisan";
            }
        } else if (review.reviewType === "supplier") {
            if (review.supplier && review.supplier.toString() === req.user._id.toString()) {
                canRespond = true;
                responderType = "Supplier";
            }
        } else if (review.reviewType === "tourism_package") {
            const tourismPackage = await TourismPackage.findById(review.tourismPackage);
            if (tourismPackage && tourismPackage.provider.toString() === req.user._id.toString()) {
                canRespond = true;
                responderType = "TourismProvider";
            }
        }

        if (!canRespond) {
            return res.status(403).json({
                success: false,
                error: "You can only respond to reviews for your own products/services",
                code: "ACCESS_DENIED"
            });
        }

        await review.addResponse(req.user._id, responderType, responseText);

        res.status(200).json({
            success: true,
            message: "Response added successfully",
            data: {
                response: review.response
            }
        });

    } catch (error) {
        console.error("Respond to review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Helper function to update entity ratings
const updateEntityRating = async (review) => {
    try {
        switch (review.reviewType) {
            case "product":
                if (review.product) {
                    const product = await Product.findById(review.product);
                    if (product) await product.updateRating();
                }
                break;
            case "artisan":
                if (review.artisan) {
                    const artisan = await Artisan.findById(review.artisan);
                    if (artisan) await artisan.updateRating();
                }
                break;
            case "tourism_package":
                if (review.tourismPackage) {
                    const tourismPackage = await TourismPackage.findById(review.tourismPackage);
                    if (tourismPackage) {
                        const stats = await Review.getReviewStats(review.tourismPackage, "tourism_package");
                        tourismPackage.rating.average = stats.averageRating;
                        tourismPackage.rating.totalReviews = stats.totalReviews;
                        await tourismPackage.save();
                    }
                }
                break;
        }
    } catch (error) {
        console.error("Update entity rating error:", error);
    }
};

// Approve Review (Admin only)
export const approveReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderationNotes } = req.body;

        if (req.user.userType !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Only admins can approve reviews",
                code: "ADMIN_REQUIRED"
            });
        }

        const review = await Review.findByIdAndUpdate(
            id,
            {
                status: "approved",
                moderationNotes,
                moderatedBy: req.user._id,
                moderatedAt: new Date()
            },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        // Update entity ratings
        await updateEntityRating(review);

        res.status(200).json({
            success: true,
            message: "Review approved successfully",
            data: {
                review
            }
        });

    } catch (error) {
        console.error("Approve review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Reject Review (Admin only)
export const rejectReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderationNotes } = req.body;

        if (req.user.userType !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Only admins can reject reviews",
                code: "ADMIN_REQUIRED"
            });
        }

        const review = await Review.findByIdAndUpdate(
            id,
            {
                status: "rejected",
                moderationNotes,
                moderatedBy: req.user._id,
                moderatedAt: new Date()
            },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
                code: "REVIEW_NOT_FOUND"
            });
        }

        res.status(200).json({
            success: true,
            message: "Review rejected successfully",
            data: {
                review
            }
        });

    } catch (error) {
        console.error("Reject review error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};