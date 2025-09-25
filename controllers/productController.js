import Product from "../models/Product.js";
import User from "../models/User.js"; // Replacing Artisan with User
import Review from "../models/Review.js";
import mongoose from "mongoose";

// Create Product (Artisan only)
export const createProduct = async (req, res) => {
    try {
        // Ensure the user is an artisan
        if (req.user.userType !== 'artisan') {
            return res.status(403).json({
                success: false,
                error: "Only artisans can create products",
                code: "ACCESS_DENIED"
            });
        }
        console.log("Creating product with data:", req.body);

        const productData = {
            ...req.body,
            artisan: req.user._id
        };

        const product = new Product(productData);
        await product.save();

        // Update artisan's product count if method exists
        const artisanUser = await User.findById(req.user._id);
        if (artisanUser && typeof artisanUser.updateProductCount === "function") {
            await artisanUser.updateProductCount();
        }

        await product.populate("artisan", "firstName lastName businessInfo.businessName craftSpecialty");

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: { product }
        });
        


    } catch (error) {
        console.error("Create product error:", error);

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

// Get All Products with Filtering and Pagination
export const getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = "-createdAt",
            category,
            minPrice,
            maxPrice,
            rating,
            artisan,
            search,
            inStock,
            isFeatured,
            sustainabilityRating
        } = req.query;

        const filter = { isActive: true, status: "active" };

        if (category) filter.category = category;
        if (artisan) filter.artisan = artisan;
        if (isFeatured) filter.isFeatured = isFeatured === "true";
        if (inStock === "true") filter["inventory.quantity"] = { $gt: 0 };
        if (sustainabilityRating) filter["materials.sustainabilityRating"] = sustainabilityRating;
        if (minPrice || maxPrice) {
            filter["pricing.basePrice"] = {};
            if (minPrice) filter["pricing.basePrice"].$gte = parseFloat(minPrice);
            if (maxPrice) filter["pricing.basePrice"].$lte = parseFloat(maxPrice);
        }
        if (rating) filter["rating.average"] = { $gte: parseFloat(rating) };
        if (search) filter.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let sortObject = {};
        if (sort.startsWith("-")) sortObject[sort.substring(1)] = -1;
        else sortObject[sort] = 1;
        if (search) sortObject = { score: { $meta: "textScore" }, ...sortObject };

        const products = await Product.find(filter)
            .populate({
                path: "artisan",
                match: { userType: "artisan" },
                select: "firstName lastName businessInfo.businessName craftSpecialty rating workshopLocation.district"
            })
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalProducts,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Product by ID
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid product ID", code: "INVALID_ID" });
        }

        const product = await Product.findOne({ _id: id, isActive: true })
            .populate({
                path: "artisan",
                match: { userType: "artisan" },
                select: "firstName lastName businessInfo.businessName craftSpecialty rating workshopLocation culturalStory socialMedia"
            })
            .lean();

        if (!product) return res.status(404).json({ success: false, error: "Product not found", code: "PRODUCT_NOT_FOUND" });

        const relatedProducts = await Product.find({
            _id: { $ne: product._id },
            artisan: product.artisan._id,
            isActive: true,
            status: "active"
        })
        .limit(4)
        .populate("artisan", "firstName lastName businessInfo.businessName")
        .lean();

        const similarProducts = await Product.find({
            _id: { $ne: product._id },
            category: product.category,
            isActive: true,
            status: "active"
        })
        .sort({ "rating.average": -1 })
        .limit(6)
        .populate("artisan", "firstName lastName businessInfo.businessName")
        .lean();

        res.status(200).json({ success: true, data: { product, relatedProducts, similarProducts } });

    } catch (error) {
        console.error("Get product by ID error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Update Product (Artisan only - own products)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Invalid product ID", code: "INVALID_ID" });

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, error: "Product not found", code: "PRODUCT_NOT_FOUND" });
        if (product.artisan.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, error: "You can only update your own products", code: "ACCESS_DENIED" });

        const updatedProduct = await Product.findByIdAndUpdate(id, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true })
            .populate("artisan", "firstName lastName businessInfo.businessName craftSpecialty");

        res.status(200).json({ success: true, message: "Product updated successfully", data: { product: updatedProduct } });

    } catch (error) {
        console.error("Update product error:", error);
        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
            return res.status(400).json({ success: false, error: "Validation failed", code: "VALIDATION_ERROR", details: validationErrors });
        }
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Delete Product (Artisan only - own products)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Invalid product ID", code: "INVALID_ID" });

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, error: "Product not found", code: "PRODUCT_NOT_FOUND" });
        if (product.artisan.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, error: "You can only delete your own products", code: "ACCESS_DENIED" });

        await Product.findByIdAndUpdate(id, { isActive: false, status: "discontinued", updatedAt: new Date() });

        const artisanUser = await User.findById(req.user._id);
        if (artisanUser && typeof artisanUser.updateProductCount === "function") await artisanUser.updateProductCount();

        res.status(200).json({ success: true, message: "Product deleted successfully" });

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Get Artisan's Products
export const getArtisanProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, sort = "-createdAt" } = req.query;
        const filter = { artisan: req.user._id, isActive: true };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        let sortObject = {};
        if (sort.startsWith("-")) sortObject[sort.substring(1)] = -1;
        else sortObject[sort] = 1;

        const products = await Product.find(filter).sort(sortObject).skip(skip).limit(parseInt(limit));
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalProducts,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get artisan products error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Reserve Inventory
export const reserveInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) return res.status(400).json({ success: false, error: "Valid quantity is required", code: "INVALID_QUANTITY" });

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, error: "Product not found", code: "PRODUCT_NOT_FOUND" });

        const success = await product.reserveInventory(quantity);
        if (!success) return res.status(400).json({ success: false, error: "Insufficient inventory", code: "INSUFFICIENT_INVENTORY", availableQuantity: product.availableQuantity });

        res.status(200).json({ success: true, message: "Inventory reserved successfully", data: { reservedQuantity: quantity, availableQuantity: product.availableQuantity } });

    } catch (error) {
        console.error("Reserve inventory error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Get Product Reviews
export const getProductReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let sortObject = {};
        if (sort.startsWith("-")) sortObject[sort.substring(1)] = -1;
        else sortObject[sort] = 1;

        const reviews = await Review.find({ product: id, status: "approved", isVisible: true })
            .populate("reviewer", "firstName lastName")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalReviews = await Review.countDocuments({ product: id, status: "approved", isVisible: true });
        const reviewStats = await Review.getReviewStats(id, "product");

        res.status(200).json({
            success: true,
            data: {
                reviews,
                statistics: reviewStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalReviews / parseInt(limit)),
                    totalReviews,
                    hasNextPage: parseInt(page) < Math.ceil(totalReviews / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get product reviews error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Get Featured Products
export const getFeaturedProducts = async (req, res) => {
    try {
        const { limit = 12 } = req.query;
        const featuredProducts = await Product.find({ isFeatured: true, isActive: true, status: "active" })
            .populate({
                path: "artisan",
                match: { userType: "artisan" },
                select: "firstName lastName businessInfo.businessName craftSpecialty"
            })
            .sort({ "rating.average": -1, "sales.totalSold": -1 })
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({ success: true, data: { products: featuredProducts } });

    } catch (error) {
        console.error("Get featured products error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Get Product Categories with Counts
export const getCategories = async (req, res) => {
    try {
        const categories = await Product.aggregate([
            { $match: { isActive: true, status: "active" } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    avgPrice: { $avg: "$pricing.basePrice" },
                    subcategories: { $addToSet: "$subcategory" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({ success: true, data: { categories } });

    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};

// Search Products with Advanced Filters
export const searchProducts = async (req, res) => {
    try {
        const {
            q, category, subcategory, minPrice, maxPrice, rating, artisan, region,
            craftTechnique, sustainabilityRating, customizable, page = 1, limit = 20, sort = "-createdAt"
        } = req.query;

        const pipeline = [];
        const matchStage = { isActive: true, status: "active" };

        if (category) matchStage.category = category;
        if (subcategory) matchStage.subcategory = subcategory;
        if (artisan) matchStage.artisan = new mongoose.Types.ObjectId(artisan);
        if (customizable) matchStage["customization.isCustomizable"] = customizable === "true";
        if (sustainabilityRating) matchStage["materials.sustainabilityRating"] = sustainabilityRating;
        if (minPrice || maxPrice) {
            matchStage["pricing.basePrice"] = {};
            if (minPrice) matchStage["pricing.basePrice"].$gte = parseFloat(minPrice);
            if (maxPrice) matchStage["pricing.basePrice"].$lte = parseFloat(maxPrice);
        }
        if (rating) matchStage["rating.average"] = { $gte: parseFloat(rating) };
        if (q) matchStage.$text = { $search: q };
        if (craftTechnique) matchStage["craftingDetails.techniqueUsed"] = { $in: [craftTechnique] };

        pipeline.push({ $match: matchStage });

        if (q) pipeline.push({ $addFields: { score: { $meta: "textScore" } } });

        pipeline.push({
            $lookup: {
                from: "users",
                let: { artisanId: "$artisan" },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ["$_id", "$$artisanId"] }, { $eq: ["$userType", "artisan"] }] } } },
                    { $project: { firstName: 1, lastName: 1, "businessInfo.businessName": 1, craftSpecialty: 1, "workshopLocation.district": 1, rating: 1 } }
                ],
                as: "artisan"
            }
        });

        pipeline.push({ $unwind: "$artisan" });

        if (region) pipeline.push({ $match: { "artisan.workshopLocation.district": region } });

        let sortStage = {};
        if (q) sortStage.score = { $meta: "textScore" };
        if (sort.startsWith("-")) sortStage[sort.substring(1)] = -1;
        else sortStage[sort] = 1;

        pipeline.push({ $sort: sortStage });

        pipeline.push({ $facet: { products: [{ $skip: (parseInt(page) - 1) * parseInt(limit) }, { $limit: parseInt(limit) }], totalCount: [{ $count: "count" }] } });

        const [result] = await Product.aggregate(pipeline);

        const products = result.products || [];
        const totalProducts = result.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalProducts / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: { currentPage: parseInt(page), totalPages, totalProducts, hasNextPage: parseInt(page) < totalPages, hasPrevPage: parseInt(page) > 1, limit: parseInt(limit) }
            }
        });

    } catch (error) {
        console.error("Search products error:", error);
        res.status(500).json({ success: false, error: "Internal server error", code: "SERVER_ERROR" });
    }
};
