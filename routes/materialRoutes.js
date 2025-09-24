import express from "express";
import {
    createMaterial,
    getAllMaterials,
    getMaterialById,
    updateMaterial,
    deleteMaterial,
    reserveStock,
    getCategories,
    searchMaterials,
    updateStockLevel,
    getTrendingMaterials
} from "../controllers/materialController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateMaterial,
    validateObjectId,
    validatePagination,
    validateSearch,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", validatePagination, validateSearch, getAllMaterials);
router.get("/search", validatePagination, validateSearch, searchMaterials);
router.get("/trending", getTrendingMaterials);
router.get("/categories", getCategories);
router.get("/:id", validateObjectId(), getMaterialById);

// Protected routes - Supplier only
router.use(requireAuth);

router.post("/", requireRole("supplier"), sanitizeInput, validateMaterial, createMaterial);
router.put("/:id", requireRole("supplier"), validateObjectId(), sanitizeInput, updateMaterial);
router.delete("/:id", requireRole("supplier"), validateObjectId(), deleteMaterial);

// Stock management (Supplier only)
router.put("/:id/stock", requireRole("supplier"), validateObjectId(), sanitizeInput, updateStockLevel);

// Stock reservation (Authenticated users)
router.post("/:id/reserve", validateObjectId(), reserveStock);

export default router;