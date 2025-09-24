import express from "express";
import {
    getAllSuppliers,
    getSupplierById,
    getDashboardData,
    updateSupplierProfile,
    addContractedArtisan,
    removeContractedArtisan,
    getSupplierMaterials,
    getAnalytics
} from "../controllers/supplierController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateObjectId,
    validatePagination,
    validateSearch,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", validatePagination, validateSearch, getAllSuppliers);
router.get("/:id", validateObjectId(), getSupplierById);

// Protected routes - Supplier only
router.use(requireAuth);
router.use(requireRole("supplier"));

// Dashboard and profile routes
router.get("/dashboard/data", getDashboardData);
router.get("/dashboard/analytics", getAnalytics);
router.put("/profile", sanitizeInput, updateSupplierProfile);

// Material management routes
router.get("/materials/my-materials", validatePagination, getSupplierMaterials);

// Contracted artisan management
router.post("/contracts/artisans", sanitizeInput, addContractedArtisan);
router.delete("/contracts/artisans/:artisanId", validateObjectId("artisanId"), removeContractedArtisan);

export default router;