import { body, param, query, validationResult } from "express-validator";

// Helper function to handle validation results
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors.array()
        });
    }
    next();
};

// User registration validation
export const validateUserRegistration = [
    body("email")
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
    body("firstName")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2-50 characters"),
    body("lastName")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Last name must be between 2-50 characters"),
    body("phoneNumber")
        .isMobilePhone("si-LK")
        .withMessage("Valid Sri Lankan phone number is required"),
    body("userType")
        .isIn(["artisan", "customer", "supplier", "tourism_provider"])
        .withMessage("Invalid user type"),
    handleValidationErrors
];

// User login validation
export const validateUserLogin = [
    body("email")
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Password is required"),
    handleValidationErrors
];

// Product validation
export const validateProduct = [
    body("name")
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Product name must be between 3-200 characters"),
    body("description")
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10-2000 characters"),
    body("category")
        .isIn([
            "wood_carving", "pottery", "batik", "jewelry", "textiles", 
            "metalwork", "leather_craft", "bamboo_craft", "stone_carving", 
            "masks", "traditional_painting", "decorative_items", "functional_items"
        ])
        .withMessage("Invalid category"),
    body("subcategory")
        .trim()
        .notEmpty()
        .withMessage("Subcategory is required"),
    body("pricing.basePrice")
        .isNumeric({ min: 0 })
        .withMessage("Base price must be a positive number"),
    body("inventory.quantity")
        .isInt({ min: 0 })
        .withMessage("Quantity must be a non-negative integer"),
    body("craftingDetails.techniqueUsed")
        .isArray({ min: 1 })
        .withMessage("At least one crafting technique is required"),
    body("craftingDetails.timeToCraft")
        .trim()
        .notEmpty()
        .withMessage("Time to craft is required"),
    body("craftingDetails.skillLevel")
        .isIn(["beginner", "intermediate", "advanced", "master"])
        .withMessage("Invalid skill level"),
    handleValidationErrors
];

// Order validation
export const validateOrder = [
    body("items")
        .isArray({ min: 1 })
        .withMessage("Order must contain at least one item"),
    body("items.*.product")
        .isMongoId()
        .withMessage("Valid product ID is required"),
    body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),
    body("shippingAddress.firstName")
        .trim()
        .notEmpty()
        .withMessage("First name is required"),
    body("shippingAddress.lastName")
        .trim()
        .notEmpty()
        .withMessage("Last name is required"),
    body("shippingAddress.street")
        .trim()
        .notEmpty()
        .withMessage("Street address is required"),
    body("shippingAddress.city")
        .trim()
        .notEmpty()
        .withMessage("City is required"),
    body("shippingAddress.province")
        .trim()
        .notEmpty()
        .withMessage("Province is required"),
    body("shippingAddress.postalCode")
        .trim()
        .notEmpty()
        .withMessage("Postal code is required"),
    body("shippingAddress.phoneNumber")
        .isMobilePhone("si-LK")
        .withMessage("Valid phone number is required"),
    body("payment.method")
        .isIn(["card", "bank_transfer", "cash_on_delivery", "mobile_payment"])
        .withMessage("Invalid payment method"),
    body("shipping.method")
        .isIn(["standard", "express", "pickup", "international"])
        .withMessage("Invalid shipping method"),
    handleValidationErrors
];

// Review validation
export const validateReview = [
    body("reviewType")
        .isIn(["product", "artisan", "tourism_package", "supplier"])
        .withMessage("Invalid review type"),
    body("rating.overall")
        .isInt({ min: 1, max: 5 })
        .withMessage("Overall rating must be between 1-5"),
    body("title")
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage("Title must be between 3-100 characters"),
    body("comment")
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage("Comment must be between 10-1000 characters"),
    handleValidationErrors
];

// Material validation
export const validateMaterial = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Material name must be between 2-100 characters"),
    body("category")
        .isIn([
            "wood", "clay", "metal", "fabric", "leather", "bamboo", 
            "stone", "gems", "dyes", "tools", "varnish", "adhesives", 
            "threads", "beads", "other"
        ])
        .withMessage("Invalid material category"),
    body("subcategory")
        .trim()
        .notEmpty()
        .withMessage("Subcategory is required"),
    body("description")
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage("Description must be between 10-1000 characters"),
    body("pricing.unitPrice")
        .isNumeric({ min: 0 })
        .withMessage("Unit price must be a positive number"),
    body("pricing.unit")
        .isIn(["piece", "kg", "meter", "liter", "sheet", "roll", "bundle"])
        .withMessage("Invalid pricing unit"),
    body("inventory.currentStock")
        .isInt({ min: 0 })
        .withMessage("Current stock must be a non-negative integer"),
    handleValidationErrors
];

// Tourism Package validation
export const validateTourismPackage = [
    body("title")
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage("Title must be between 5-200 characters"),
    body("description")
        .trim()
        .isLength({ min: 50, max: 2000 })
        .withMessage("Description must be between 50-2000 characters"),
    body("type")
        .isIn(["day_tour", "half_day_tour", "multi_day_tour", "workshop", "experience", "cultural_immersion"])
        .withMessage("Invalid tour type"),
    body("category")
        .isIn(["cultural_heritage", "traditional_crafts", "village_life", "religious_sites", "culinary", "nature_crafts", "festivals"])
        .withMessage("Invalid category"),
    body("duration.value")
        .isNumeric({ min: 0.5 })
        .withMessage("Duration must be at least 0.5"),
    body("duration.unit")
        .isIn(["hours", "days"])
        .withMessage("Duration unit must be hours or days"),
    body("pricing.basePrice")
        .isNumeric({ min: 0 })
        .withMessage("Base price must be a positive number"),
    body("requirements.maxParticipants")
        .isInt({ min: 1 })
        .withMessage("Maximum participants must be at least 1"),
    handleValidationErrors
];

// MongoDB ObjectID validation
export const validateObjectId = (paramName = "id") => [
    param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} format`),
    handleValidationErrors
];

// Pagination validation
export const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1-100"),
    query("sort")
        .optional()
        .isIn(["createdAt", "-createdAt", "price", "-price", "rating", "-rating", "name", "-name"])
        .withMessage("Invalid sort parameter"),
    handleValidationErrors
];

// Search validation
export const validateSearch = [
    query("q")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1-100 characters"),
    query("category")
        .optional()
        .isIn([
            "wood_carving", "pottery", "batik", "jewelry", "textiles", 
            "metalwork", "leather_craft", "bamboo_craft", "stone_carving", 
            "masks", "traditional_painting"
        ])
        .withMessage("Invalid category filter"),
    query("minPrice")
        .optional()
        .isNumeric({ min: 0 })
        .withMessage("Minimum price must be a positive number"),
    query("maxPrice")
        .optional()
        .isNumeric({ min: 0 })
        .withMessage("Maximum price must be a positive number"),
    query("rating")
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage("Rating filter must be between 0-5"),
    handleValidationErrors
];

// File upload validation
export const validateFileUpload = (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            error: "No files uploaded",
            code: "NO_FILES"
        });
    }

    // Check file types and sizes
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (let fileKey in req.files) {
        const file = req.files[fileKey];
        
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
                code: "INVALID_FILE_TYPE"
            });
        }

        if (file.size > maxSize) {
            return res.status(400).json({
                error: "File too large. Maximum size is 5MB",
                code: "FILE_TOO_LARGE"
            });
        }
    }

    next();
};

// Custom validation for artisan-specific fields
export const validateArtisanProfile = [
    body("craftSpecialty")
        .isArray({ min: 1 })
        .withMessage("At least one craft specialty is required"),
    body("craftSpecialty.*")
        .isIn([
            "wood_carving", "pottery", "batik", "jewelry", "textiles", 
            "metalwork", "leather_craft", "bamboo_craft", "stone_carving", 
            "masks", "traditional_painting", "other"
        ])
        .withMessage("Invalid craft specialty"),
    body("experience")
        .isInt({ min: 0, max: 70 })
        .withMessage("Experience must be between 0-70 years"),
    body("businessInfo.businessName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Business name must be between 2-100 characters"),
    handleValidationErrors
];

// Sanitization middleware
export const sanitizeInput = (req, res, next) => {
    // Remove potential XSS content
    const sanitizeString = (str) => {
        if (typeof str === "string") {
            return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                     .replace(/javascript:/gi, "")
                     .replace(/on\w+=/gi, "");
        }
        return str;
    };

    const sanitizeObject = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === "string") {
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    };

    if (req.body) {
        sanitizeObject(req.body);
    }
    
    if (req.query) {
        sanitizeObject(req.query);
    }

    next();
};