// controllers/reviewController.js
import Review from "../models/review.js";

export async function addReview(req, res) {
    try {
        if (req.user.role !== "customer") {
            return res.status(403).json({
                message: "Only customers can add reviews"
            });
        }

        const reviewData = req.body;
        reviewData.customerId = req.user.customerId;
        reviewData.customerName = `${req.user.firstName} ${req.user.lastName}`;

        // Check if customer has ordered this product
        const hasOrdered = await Order.findOne({
            customerId: req.user.customerId,
            "items.productId": reviewData.productId,
            status: "delivered"
        });

        if (!hasOrdered) {
            return res.status(400).json({
                message: "You can only review products you have purchased and received"
            });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            customerId: req.user.customerId,
            productId: reviewData.productId
        });

        if (existingReview) {
            return res.status(409).json({
                message: "You have already reviewed this product"
            });
        }

        const newReview = new Review(reviewData);
        await newReview.save();

        // Update product rating
        await updateProductRating(reviewData.productId);

        res.status(201).json({
            message: "Review added successfully",
            review: newReview
        });

    } catch (err) {
        console.error("Add review error:", err);
        res.status(500).json({
            message: "Failed to add review",
            error: err.message
        });
    }
}

export async function getReviews(req, res) {
    try {
        let query = { isApproved: true };
        
        if (req.user && req.user.role === "admin") {
            query = {}; // Admin can see all reviews
        }

        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .populate('productId', 'name images');

        res.json({
            message: "Reviews fetched successfully",
            reviews: reviews
        });

    } catch (err) {
        console.error("Get reviews error:", err);
        res.status(500).json({
            message: "Failed to fetch reviews",
            error: err.message
        });
    }
}

export async function getProductReviews(req, res) {
    try {
        const { productId } = req.params;
        
        const reviews = await Review.find({ 
            productId: productId, 
            isApproved: true 
        }).sort({ createdAt: -1 });

        const reviewStats = await Review.aggregate([
            { $match: { productId: productId, isApproved: true } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: "$rating"
                    }
                }
            }
        ]);

        const stats = reviewStats[0] || {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: []
        };

        // Calculate rating distribution
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        stats.ratingDistribution.forEach(rating => {
            distribution[rating] = (distribution[rating] || 0) + 1;
        });

        res.json({
            message: "Product reviews fetched successfully",
            reviews: reviews,
            statistics: {
                averageRating: parseFloat(stats.averageRating?.toFixed(1)) || 0,
                totalReviews: stats.totalReviews,
                ratingDistribution: distribution
            }
        });

    } catch (err) {
        console.error("Get product reviews error:", err);
        res.status(500).json({
            message: "Failed to fetch product reviews",
            error: err.message
        });
    }
}

export async function updateReview(req, res) {
    try {
        const { reviewId } = req.params;
        const updateData = req.body;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        // Only review owner or admin can update
        if (req.user.role !== "admin" && review.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Don't allow changing sensitive fields
        delete updateData.customerId;
        delete updateData.productId;
        delete updateData.isApproved;

        await Review.findByIdAndUpdate(reviewId, updateData);

        // Update product rating if rating changed
        if (updateData.rating) {
            await updateProductRating(review.productId);
        }

        res.json({
            message: "Review updated successfully"
        });

    } catch (err) {
        console.error("Update review error:", err);
        res.status(500).json({
            message: "Failed to update review",
            error: err.message
        });
    }
}

export async function deleteReview(req, res) {
    try {
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        // Only review owner or admin can delete
        if (req.user.role !== "admin" && review.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        await Review.findByIdAndDelete(reviewId);
        await updateProductRating(review.productId);

        res.json({
            message: "Review deleted successfully"
        });

    } catch (err) {
        console.error("Delete review error:", err);
        res.status(500).json({
            message: "Failed to delete review",
            error: err.message
        });
    }
}

export async function approveReview(req, res) {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        const { reviewId } = req.params;
        
        await Review.findByIdAndUpdate(reviewId, { isApproved: true });

        res.json({
            message: "Review approved successfully"
        });

    } catch (err) {
        console.error("Approve review error:", err);
        res.status(500).json({
            message: "Failed to approve review",
            error: err.message
        });
    }
}

// Helper function to update product rating
async function updateProductRating(productId) {
    try {
        const reviewStats = await Review.aggregate([
            { $match: { productId: productId, isApproved: true } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        const stats = reviewStats[0] || { averageRating: 0, totalReviews: 0 };

        await Product.findOneAndUpdate(
            { productId: productId },
            {
                "ratings.average": parseFloat(stats.averageRating.toFixed(1)),
                "ratings.count": stats.totalReviews
            }
        );
    } catch (err) {
        console.error("Update product rating error:", err);
    }
}