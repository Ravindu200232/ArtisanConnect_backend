import express from "express";
import {
    createReview,
    getReviewsByEntity,
    getUserReviews,
    updateReview,
    deleteReview,
    addHelpfulnessVote,
    flagReview,
    respondToReview,
    approveReview,
    rejectReview
} from "../controllers/reviewController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateReview,
    validateObjectId,
    validatePagination,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/:entityType/:entityId", validatePagination, getReviewsByEntity);

// Protected routes
router.use(requireAuth);

// Customer routes
router.post("/", requireRole("customer"), sanitizeInput, validateReview, createReview);
router.get("/user/my-reviews", validatePagination, getUserReviews);
router.put("/:id", validateObjectId(), sanitizeInput, updateReview);
router.delete("/:id", validateObjectId(), deleteReview);

// Interaction routes (all authenticated users)
router.post("/:id/vote", validateObjectId(), sanitizeInput, addHelpfulnessVote);
router.post("/:id/flag", validateObjectId(), sanitizeInput, flagReview);

// Response routes (artisan, supplier, tourism provider)
router.post("/:id/respond", validateObjectId(), sanitizeInput, respondToReview);

// Admin routes
router.post("/:id/approve", requireRole("admin"), validateObjectId(), sanitizeInput, approveReview);
router.post("/:id/reject", requireRole("admin"), validateObjectId(), sanitizeInput, rejectReview);

export default router;