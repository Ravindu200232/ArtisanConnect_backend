import express from "express";
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getArtisanProducts,
    reserveInventory,
    getProductReviews,
    getFeaturedProducts,
    getCategories,
    searchProducts
} from "../controllers/productController.js";

import { requireAuth, requireRole, requireOwnership } from "../middleware/authMiddleware.js";
import {
    validateProduct,
    validateObjectId,
    validatePagination,
    validateSearch,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", validatePagination, validateSearch, getAllProducts);
router.get("/search", validatePagination, validateSearch, searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/categories", getCategories);
router.get("/:id", validateObjectId(), getProductById);
router.get("/:id/reviews", validateObjectId(), validatePagination, getProductReviews);

// Protected routes - Artisan only
router.use(requireAuth);

router.post("/", requireRole("artisan"), sanitizeInput, createProduct);
router.get("/artisan/my-products", requireRole("artisan"), validatePagination, getArtisanProducts);
router.put("/:id", requireRole("artisan"), validateObjectId(), sanitizeInput, updateProduct);
router.delete("/:id", requireRole("artisan"), validateObjectId(), deleteProduct);

// Inventory management
router.post("/:id/reserve", validateObjectId(), reserveInventory);

export default router;