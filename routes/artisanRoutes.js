import express from "express";
import {
    getAllArtisans,
    getArtisanById,
    getDashboardData,
    updateArtisanProfile,
    updateBankDetails,
    getAnalytics,
    searchArtisans,
    getArtisanReviews
} from "../controllers/artisanController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateArtisanProfile,
    validateObjectId,
    validatePagination,
    validateSearch,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", validatePagination, validateSearch, getAllArtisans);
router.get("/search", validatePagination, validateSearch, searchArtisans);
router.get("/:id", validateObjectId(), getArtisanById);
router.get("/:id/reviews", validateObjectId(), validatePagination, getArtisanReviews);

// Protected routes - Artisan only
router.use(requireAuth);
router.use(requireRole("artisan"));

router.get("/dashboard/data", getDashboardData);
router.get("/dashboard/analytics", getAnalytics);
router.get("/profile/reviews", validatePagination, getArtisanReviews);
router.put("/profile", sanitizeInput, validateArtisanProfile, updateArtisanProfile);
router.put("/bank-details", sanitizeInput, updateBankDetails);

export default router;