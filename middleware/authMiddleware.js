import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
    let token = req.header("Authorization");

    // Skip auth for public routes
    const publicRoutes = [
        "/api/auth/login",
        "/api/auth/register", 
        "/api/health",
        "/api/products/public",
        "/api/artisans/public",
        "/api/tourism/public"
    ];

    const isPublicRoute = publicRoutes.some(route => req.path.includes(route));
    
    if (isPublicRoute) {
        return next();
    }

    if (token != null) {
        try {
            // Remove Bearer prefix
            token = token.replace("Bearer ", "");
            
            // Verify token
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            
            // Get user from database to ensure user still exists and is active
            const user = await User.findById(decoded.id).select("-password");
            
            if (!user) {
                return res.status(401).json({ 
                    error: "User not found", 
                    code: "USER_NOT_FOUND" 
                });
            }

            if (!user.isActive) {
                return res.status(401).json({ 
                    error: "Account is deactivated", 
                    code: "ACCOUNT_DEACTIVATED" 
                });
            }

            // Add user to request object
            req.user = user;
            req.userId = user._id;
            req.userType = user.userType;
            
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ 
                    error: "Token expired", 
                    code: "TOKEN_EXPIRED" 
                });
            } else if (err.name === "JsonWebTokenError") {
                return res.status(401).json({ 
                    error: "Invalid token", 
                    code: "INVALID_TOKEN" 
                });
            } else {
                return res.status(401).json({ 
                    error: "Authentication failed", 
                    code: "AUTH_FAILED" 
                });
            }
        }
    } else {
        // No token provided for protected route
        return res.status(401).json({ 
            error: "Access token required", 
            code: "TOKEN_REQUIRED" 
        });
    }

    next();
};

// Middleware to require authentication (use for protected routes)
export const requireAuth = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: "Authentication required", 
            code: "AUTH_REQUIRED" 
        });
    }
    next();
};

// Middleware to check if user is verified
export const requireVerification = async (req, res, next) => {
    if (!req.user.isVerified) {
        return res.status(403).json({ 
            error: "Email verification required", 
            code: "VERIFICATION_REQUIRED" 
        });
    }
    next();
};

// Middleware to check user role
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: "Authentication required", 
                code: "AUTH_REQUIRED" 
            });
        }

        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({ 
                error: "Insufficient permissions", 
                code: "INSUFFICIENT_PERMISSIONS",
                required: roles,
                current: req.user.userType
            });
        }

        next();
    };
};

// Middleware to check if user owns resource or is admin
export const requireOwnership = (resourceOwnerField = "user") => {
    return async (req, res, next) => {
        try {
            // Admin can access everything
            if (req.user.userType === "admin") {
                return next();
            }

            const resourceId = req.params.id;
            const modelName = req.baseUrl.split("/")[2]; // Extract model from route
            
            let Model;
            switch (modelName) {
                case "products":
                    Model = (await import("../models/Product.js")).default;
                    resourceOwnerField = "artisan";
                    break;
                case "orders":
                    Model = (await import("../models/Order.js")).default;
                    resourceOwnerField = "customer";
                    break;
                case "materials":
                    Model = (await import("../models/Material.js")).default;
                    resourceOwnerField = "supplier";
                    break;
                case "tourism":
                    Model = (await import("../models/Tourism.js")).TourismPackage;
                    resourceOwnerField = "provider";
                    break;
                default:
                    return res.status(400).json({ 
                        error: "Invalid resource type", 
                        code: "INVALID_RESOURCE" 
                    });
            }

            const resource = await Model.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({ 
                    error: "Resource not found", 
                    code: "RESOURCE_NOT_FOUND" 
                });
            }

            if (resource[resourceOwnerField].toString() !== req.user._id.toString()) {
                return res.status(403).json({ 
                    error: "Access denied", 
                    code: "ACCESS_DENIED" 
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ 
                error: "Authorization check failed", 
                code: "AUTH_CHECK_FAILED" 
            });
        }
    };
};

export default authMiddleware;