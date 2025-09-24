import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Artisan from "../models/Artisan.js";
import Customer from "../models/Customer.js";
import Supplier from "../models/Supplier.js";
import { TourismProvider } from "../models/Tourism.js";

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId, type: "refresh" },
        process.env.REFRESH_SECRET_KEY,
        { expiresIn: "30d" }
    );
};

// Register User
export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, userType, address, ...additionalData } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "User already exists with this email",
                code: "USER_EXISTS"
            });
        }

        // Create user based on type
        let newUser;
        const baseUserData = {
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            userType,
            address
        };

        switch (userType) {
            case "artisan":
                newUser = new Artisan({
                    ...baseUserData,
                    craftSpecialty: additionalData.craftSpecialty || ["other"],
                    experience: additionalData.experience || 0,
                    workshopLocation: additionalData.workshopLocation,
                    businessInfo: additionalData.businessInfo
                });
                break;

            case "customer":
                newUser = new Customer({
                    ...baseUserData,
                    preferences: additionalData.preferences,
                    culturalInterests: additionalData.culturalInterests
                });
                break;

            case "supplier":
                newUser = new Supplier({
                    ...baseUserData,
                    companyName: additionalData.companyName,
                    businessRegistrationNumber: additionalData.businessRegistrationNumber,
                    materialSpecialties: additionalData.materialSpecialties || []
                });
                break;

            case "tourism_provider":
                newUser = new TourismProvider({
                    ...baseUserData,
                    companyName: additionalData.companyName,
                    businessRegistrationNumber: additionalData.businessRegistrationNumber,
                    licenseNumber: additionalData.licenseNumber,
                    serviceTypes: additionalData.serviceTypes || []
                });
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: "Invalid user type",
                    code: "INVALID_USER_TYPE"
                });
        }

        await newUser.save();

        // Generate tokens
        const token = generateToken(newUser._id);
        const refreshToken = generateRefreshToken(newUser._id);

        // Remove password from response
        const userResponse = newUser.toJSON();

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        // Handle validation errors
        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                success: false,
                error: `${field} already exists`,
                code: "DUPLICATE_VALUE"
            });
        }

        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Login User
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
                code: "INVALID_CREDENTIALS"
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: "Account is deactivated",
                code: "ACCOUNT_DEACTIVATED"
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
                code: "INVALID_CREDENTIALS"
            });
        }

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Update last login
        user.updatedAt = new Date();
        await user.save();

        // Remove password from response
        const userResponse = user.toJSON();

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Refresh Token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: "Refresh token required",
                code: "REFRESH_TOKEN_REQUIRED"
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
        
        if (decoded.type !== "refresh") {
            return res.status(401).json({
                success: false,
                error: "Invalid token type",
                code: "INVALID_TOKEN_TYPE"
            });
        }

        // Get user
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: "Invalid refresh token",
                code: "INVALID_REFRESH_TOKEN"
            });
        }

        // Generate new tokens
        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        console.error("Refresh token error:", error);
        
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                error: "Refresh token expired",
                code: "REFRESH_TOKEN_EXPIRED"
            });
        }

        res.status(401).json({
            success: false,
            error: "Invalid refresh token",
            code: "INVALID_REFRESH_TOKEN"
        });
    }
};

// Get Current User Profile
export const getProfile = async (req, res) => {
    try {
        // Get user with all fields populated based on user type
        let user;
        
        switch (req.user.userType) {
            case "artisan":
                user = await Artisan.findById(req.user._id).populate("certifications");
                break;
            case "customer":
                user = await Customer.findById(req.user._id)
                    .populate("wishlist.product", "name images pricing")
                    .populate("statistics.favoriteArtisan", "firstName lastName businessInfo.businessName");
                break;
            case "supplier":
                user = await Supplier.findById(req.user._id)
                    .populate("contractedArtisans.artisan", "firstName lastName craftSpecialty");
                break;
            case "tourism_provider":
                user = await TourismProvider.findById(req.user._id);
                break;
            default:
                user = await User.findById(req.user._id);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Profile
export const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            "firstName", "lastName", "phoneNumber", "address", "profileImage"
        ];

        // Add user-type specific allowed fields
        const userTypeSpecificFields = {
            artisan: ["craftSpecialty", "experience", "workshopLocation", "businessInfo", "skills", "socialMedia", "culturalStory"],
            customer: ["preferences", "culturalInterests", "communicationPreferences"],
            supplier: ["materialSpecialties", "businessInfo", "warehouse", "paymentTerms", "delivery"],
            tourism_provider: ["serviceTypes", "operatingRegions", "languages", "teamMembers", "vehicles"]
        };

        const allAllowedUpdates = [
            ...allowedUpdates,
            ...(userTypeSpecificFields[req.user.userType] || [])
        ];

        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allAllowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                error: "Invalid updates",
                code: "INVALID_UPDATES",
                allowedFields: allAllowedUpdates
            });
        }

        // Get the appropriate model based on user type
        let UserModel;
        switch (req.user.userType) {
            case "artisan":
                UserModel = Artisan;
                break;
            case "customer":
                UserModel = Customer;
                break;
            case "supplier":
                UserModel = Supplier;
                break;
            case "tourism_provider":
                UserModel = TourismProvider;
                break;
            default:
                UserModel = User;
        }

        const user = await UserModel.findByIdAndUpdate(
            req.user._id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error("Update profile error:", error);

        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Current password and new password are required",
                code: "MISSING_PASSWORDS"
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select("+password");
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: "Current password is incorrect",
                code: "INCORRECT_PASSWORD"
            });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "New password must be at least 6 characters long",
                code: "WEAK_PASSWORD"
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Logout
export const logout = async (req, res) => {
    try {
        // In a production app, you might want to blacklist the token
        // For now, we'll just send a success response
        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Deactivate Account
export const deactivateAccount = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { 
            isActive: false,
            updatedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Account deactivated successfully"
        });

    } catch (error) {
        console.error("Deactivate account error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Verify Email (placeholder - would integrate with email service)
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        // In production, verify the email verification token
        // For now, we'll just mark as verified
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { isVerified: true, updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            data: {
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Request Password Reset (placeholder)
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists or not
            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent"
            });
        }

        // In production, generate reset token and send email
        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email"
        });

    } catch (error) {
        console.error("Password reset request error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Reset Password (placeholder)
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // In production, verify the reset token
        // For now, this is a placeholder
        
        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};