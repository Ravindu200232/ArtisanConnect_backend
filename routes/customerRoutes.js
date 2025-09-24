import express from "express";
import {
    getDashboardData,
    updateCustomerProfile,
    toggleWishlist,
    getWishlist,
    addShippingAddress,
    updateShippingAddress,
    deleteShippingAddress,
    getPurchaseHistory,
    getRecommendations
} from "../controllers/customerController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateObjectId,
    validatePagination,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// All routes require customer authentication
router.use(requireAuth);
router.use(requireRole("customer"));

// Dashboard and profile routes
router.get("/dashboard", getDashboardData);
router.put("/profile", sanitizeInput, updateCustomerProfile);

// Wishlist routes
router.get("/wishlist", validatePagination, getWishlist);
router.post("/wishlist/:productId", validateObjectId("productId"), toggleWishlist);

// Shipping address routes
router.post("/addresses", sanitizeInput, addShippingAddress);
router.put("/addresses/:addressId", validateObjectId("addressId"), sanitizeInput, updateShippingAddress);
router.delete("/addresses/:addressId", validateObjectId("addressId"), deleteShippingAddress);

// Purchase history and analytics
router.get("/purchase-history", validatePagination, getPurchaseHistory);

// Recommendations
router.get("/recommendations", getRecommendations);

export default router;