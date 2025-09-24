import express from "express";
import {
    createOrder,
    getCustomerOrders,
    getArtisanOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    updatePaymentStatus,
    getOrderStatistics
} from "../controllers/orderController.js";

import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
    validateOrder,
    validateObjectId,
    validatePagination,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Customer routes
router.post("/", requireRole("customer"), sanitizeInput, validateOrder, createOrder);
router.get("/customer/my-orders", requireRole("customer"), validatePagination, getCustomerOrders);

// Artisan routes
router.get("/artisan/my-orders", requireRole("artisan"), validatePagination, getArtisanOrders);

// Shared routes (customer, artisan, admin)
router.get("/statistics", getOrderStatistics);
router.get("/:id", validateObjectId(), getOrderById);
router.put("/:id/status", validateObjectId(), sanitizeInput, updateOrderStatus);
router.put("/:id/cancel", validateObjectId(), sanitizeInput, cancelOrder);
router.put("/:id/payment", validateObjectId(), sanitizeInput, updatePaymentStatus);

export default router;