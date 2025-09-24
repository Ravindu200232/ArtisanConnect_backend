import express from "express";
import {
    register,
    login,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    deactivateAccount,
    verifyEmail,
    requestPasswordReset,
    resetPassword
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
    validateUserRegistration,
    validateUserLogin,
    sanitizeInput
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", sanitizeInput, validateUserRegistration, register);
router.post("/login", sanitizeInput, validateUserLogin, login);
router.post("/refresh-token", refreshToken);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Protected routes
router.use(requireAuth); // All routes below require authentication

router.get("/profile", getProfile);
router.put("/profile", sanitizeInput, updateProfile);
router.put("/change-password", changePassword);
router.post("/logout", logout);
router.put("/deactivate", deactivateAccount);
router.post("/verify-email/:token", verifyEmail);

export default router;