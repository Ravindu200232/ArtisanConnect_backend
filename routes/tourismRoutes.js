import express from "express";
import {
    createTourismPackage,
    getAllTourismPackages,
    getTourismPackageById,
    updateTourismPackage,
    deleteTourismPackage,
    getProviderPackages,
    checkAvailability,
    getDashboardData,
    getFeaturedPackages,
    searchTourismPackages
} from "../controllers/tourismController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateTourismPackage,
    validateObjectId,
    validatePagination,
    validateSearch,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", validatePagination, validateSearch, getAllTourismPackages);
router.get("/search", validatePagination, validateSearch, searchTourismPackages);
router.get("/featured", getFeaturedPackages);
router.get("/:id", validateObjectId(), getTourismPackageById);
router.get("/:id/availability", validateObjectId(), checkAvailability);

// Protected routes - Tourism Provider only
router.use(requireAuth);
router.use(requireRole("tourism_provider"));

// Provider dashboard and analytics
router.get("/provider/dashboard", getDashboardData);
router.get("/provider/packages", validatePagination, getProviderPackages);

// Package management
router.post("/", sanitizeInput, validateTourismPackage, createTourismPackage);
router.put("/:id", validateObjectId(), sanitizeInput, updateTourismPackage);
router.delete("/:id", validateObjectId(), deleteTourismPackage);

export default router;