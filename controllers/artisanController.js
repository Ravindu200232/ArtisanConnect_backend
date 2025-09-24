import Artisan from "../models/Artisan.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

// Get All Artisans (Public)
export const getAllArtisans = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = "-createdAt",
            craftSpecialty,
            district,
            minRating,
            experience,
            search,
            isAvailable
        } = req.query;

        // Build filter object
        const filter = { 
            isActive: true,
            isVerified: true 
        };

        if (craftSpecialty) {
            filter.craftSpecialty = { $in: craftSpecialty.split(",") };
        }

        if (district) {
            filter["workshopLocation.district"] = district;
        }

        if (minRating) {
            filter["rating.average"] = { $gte: parseFloat(minRating) };
        }

        if (experience) {
            filter.experience = { $gte: parseInt(experience) };
        }

        if (isAvailable) {
            filter.isAvailableForCustomOrders = isAvailable === "true";
        }

        // Search functionality
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { "businessInfo.businessName": { $regex: search, $options: "i" } },
                { craftSpecialty: { $in: [new RegExp(search, "i")] } },
                { culturalStory: { $regex: search, $options: "i" } }
            ];
        }

        // Calculate skip value
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        // Execute query
        const artisans = await Artisan.find(filter)
            .select("-password -bankDetails -socialMedia.website")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get featured products for each artisan
        const artisansWithProducts = await Promise.all(
            artisans.map(async (artisan) => {
                const featuredProducts = await Product.find({
                    artisan: artisan._id,
                    isActive: true,
                    status: "active"
                })
                .select("name images pricing category rating")
                .sort({ "rating.average": -1, isFeatured: -1 })
                .limit(3)
                .lean();

                return {
                    ...artisan,
                    featuredProducts
                };
            })
        );

        // Get total count for pagination
        const totalArtisans = await Artisan.countDocuments(filter);
        const totalPages = Math.ceil(totalArtisans / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                artisans: artisansWithProducts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalArtisans,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get all artisans error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Artisan by ID (Public)
export const getArtisanById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid artisan ID",
                code: "INVALID_ID"
            });
        }

        const artisan = await Artisan.findOne({ 
            _id: id, 
            isActive: true 
        })
        .select("-password -bankDetails")
        .lean();

        if (!artisan) {
            return res.status(404).json({
                success: false,
                error: "Artisan not found",
                code: "ARTISAN_NOT_FOUND"
            });
        }

        // Get artisan's products
        const products = await Product.find({
            artisan: id,
            isActive: true,
            status: "active"
        })
        .select("name images pricing category rating sales inventory")
        .sort({ "rating.average": -1, isFeatured: -1 })
        .limit(20)
        .lean();

        // Get recent reviews
        const reviews = await Review.find({
            artisan: id,
            status: "approved",
            isVisible: true
        })
        .populate("reviewer", "firstName lastName")
        .populate("product", "name images")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

        // Calculate additional statistics
        const stats = await Order.aggregate([
            {
                $match: {
                    "items.artisan": new mongoose.Types.ObjectId(id),
                    status: "completed"
                }
            },
            {
                $unwind: "$items"
            },
            {
                $match: {
                    "items.artisan": new mongoose.Types.ObjectId(id)
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$items.totalPrice" },
                    totalItemsSold: { $sum: "$items.quantity" }
                }
            }
        ]);

        const statistics = stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            totalItemsSold: 0
        };

        res.status(200).json({
            success: true,
            data: {
                artisan: {
                    ...artisan,
                    statistics
                },
                products,
                reviews
            }
        });

    } catch (error) {
        console.error("Get artisan by ID error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Artisan Dashboard Data
export const getDashboardData = async (req, res) => {
    try {
        const artisanId = req.user._id;

        // Get basic statistics
        const [productStats, orderStats, reviewStats] = await Promise.all([
            // Product statistics
            Product.aggregate([
                { $match: { artisan: artisanId, isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        activeProducts: { 
                            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
                        },
                        outOfStockProducts: { 
                            $sum: { $cond: [{ $eq: ["$status", "out_of_stock"] }, 1, 0] } 
                        },
                        avgRating: { $avg: "$rating.average" },
                        totalViews: { $sum: "$views" },
                        totalSales: { $sum: "$sales.totalSold" },
                        totalRevenue: { $sum: "$sales.totalRevenue" }
                    }
                }
            ]),

            // Order statistics
            Order.aggregate([
                { $match: { "items.artisan": artisanId } },
                {
                    $unwind: "$items"
                },
                {
                    $match: { "items.artisan": artisanId }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        revenue: { $sum: "$items.totalPrice" }
                    }
                }
            ]),

            // Review statistics
            Review.aggregate([
                { $match: { artisan: artisanId } },
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: 1 },
                        avgRating: { $avg: "$rating.overall" },
                        ratingDistribution: {
                            $push: "$rating.overall"
                        }
                    }
                }
            ])
        ]);

        // Process order statistics
        const ordersByStatus = {};
        let totalOrderRevenue = 0;
        orderStats.forEach(stat => {
            ordersByStatus[stat._id] = {
                count: stat.count,
                revenue: stat.revenue
            };
            if (stat._id === "completed") {
                totalOrderRevenue += stat.revenue;
            }
        });

        // Get recent orders
        const recentOrders = await Order.find({ "items.artisan": artisanId })
            .populate("customer", "firstName lastName email")
            .populate("items.product", "name images")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Filter items to show only artisan's products
        const filteredOrders = recentOrders.map(order => ({
            ...order,
            items: order.items.filter(item => 
                item.artisan.toString() === artisanId.toString()
            )
        }));

        // Get low stock products
        const lowStockProducts = await Product.find({
            artisan: artisanId,
            isActive: true,
            $expr: { $lte: ["$inventory.quantity", "$inventory.lowStockThreshold"] }
        })
        .select("name inventory images pricing")
        .limit(10);

        // Get monthly revenue trend (last 12 months)
        const monthlyRevenue = await Order.aggregate([
            { $match: { "items.artisan": artisanId, status: "completed" } },
            { $unwind: "$items" },
            { $match: { "items.artisan": artisanId } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    revenue: { $sum: "$items.totalPrice" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        const dashboardData = {
            statistics: {
                products: productStats[0] || {
                    totalProducts: 0,
                    activeProducts: 0,
                    outOfStockProducts: 0,
                    avgRating: 0,
                    totalViews: 0,
                    totalSales: 0,
                    totalRevenue: 0
                },
                orders: ordersByStatus,
                reviews: reviewStats[0] || {
                    totalReviews: 0,
                    avgRating: 0,
                    ratingDistribution: []
                },
                totalOrderRevenue
            },
            recentOrders: filteredOrders,
            lowStockProducts,
            monthlyRevenue
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Get dashboard data error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Artisan Profile
export const updateArtisanProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            "craftSpecialty", "experience", "workshopLocation", "businessInfo", 
            "skills", "socialMedia", "culturalStory", "certifications",
            "isAvailableForCustomOrders", "preferredLanguages"
        ];

        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                error: "Invalid updates",
                code: "INVALID_UPDATES",
                allowedFields: allowedUpdates
            });
        }

        const artisan = await Artisan.findByIdAndUpdate(
            req.user._id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select("-password -bankDetails");

        res.status(200).json({
            success: true,
            message: "Artisan profile updated successfully",
            data: {
                artisan
            }
        });

    } catch (error) {
        console.error("Update artisan profile error:", error);

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

// Add or Update Bank Details
export const updateBankDetails = async (req, res) => {
    try {
        const { bankName, accountNumber, branchCode, accountHolderName } = req.body;

        if (!bankName || !accountNumber || !branchCode || !accountHolderName) {
            return res.status(400).json({
                success: false,
                error: "All bank details are required",
                code: "MISSING_BANK_DETAILS"
            });
        }

        const artisan = await Artisan.findByIdAndUpdate(
            req.user._id,
            {
                bankDetails: {
                    bankName,
                    accountNumber,
                    branchCode,
                    accountHolderName
                },
                updatedAt: new Date()
            },
            { new: true }
        ).select("-password");

        res.status(200).json({
            success: true,
            message: "Bank details updated successfully",
            data: {
                artisan: artisan.toJSON()
            }
        });

    } catch (error) {
        console.error("Update bank details error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Artisan Analytics
export const getAnalytics = async (req, res) => {
    try {
        const { period = "month" } = req.query; // month, quarter, year
        const artisanId = req.user._id;

        let dateRange = {};
        const now = new Date();

        switch (period) {
            case "week":
                dateRange = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case "month":
                dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case "quarter":
                dateRange = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                break;
            case "year":
                dateRange = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
                break;
            default:
                dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        }

        // Product performance analytics
        const productAnalytics = await Product.aggregate([
            { $match: { artisan: artisanId, isActive: true } },
            {
                $lookup: {
                    from: "reviews",
                    localField: "_id",
                    foreignField: "product",
                    as: "reviews"
                }
            },
            {
                $project: {
                    name: 1,
                    category: 1,
                    "pricing.basePrice": 1,
                    "sales.totalSold": 1,
                    "sales.totalRevenue": 1,
                    "rating.average": 1,
                    "rating.totalReviews": 1,
                    views: 1,
                    conversionRate: {
                        $cond: [
                            { $eq: ["$views", 0] },
                            0,
                            { $divide: ["$sales.totalSold", "$views"] }
                        ]
                    },
                    reviewCount: { $size: "$reviews" }
                }
            },
            { $sort: { "sales.totalRevenue": -1 } }
        ]);

        // Sales analytics by category
        const categoryAnalytics = await Product.aggregate([
            { $match: { artisan: artisanId, isActive: true } },
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalSales: { $sum: "$sales.totalSold" },
                    totalRevenue: { $sum: "$sales.totalRevenue" },
                    avgRating: { $avg: "$rating.average" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Customer analytics
        const customerAnalytics = await Order.aggregate([
            { $match: { "items.artisan": artisanId, createdAt: dateRange } },
            {
                $group: {
                    _id: "$customer",
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$pricing.totalAmount" },
                    lastOrderDate: { $max: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customerDetails",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                email: 1,
                                "address.city": 1,
                                "address.province": 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$customerDetails" },
            { $sort: { totalSpent: -1 } },
            { $limit: 20 }
        ]);

        // Daily sales trend
        const dailySales = await Order.aggregate([
            { $match: { "items.artisan": artisanId, createdAt: dateRange } },
            { $unwind: "$items" },
            { $match: { "items.artisan": artisanId } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    sales: { $sum: "$items.quantity" },
                    revenue: { $sum: "$items.totalPrice" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                period,
                productAnalytics,
                categoryAnalytics,
                customerAnalytics,
                dailySales
            }
        });

    } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Search Artisans
export const searchArtisans = async (req, res) => {
    try {
        const {
            q, // search query
            craftSpecialty,
            district,
            province,
            minRating,
            experience,
            isAvailable,
            page = 1,
            limit = 20,
            sort = "-rating.average"
        } = req.query;

        // Build aggregation pipeline
        const pipeline = [];

        // Match stage
        const matchStage = {
            isActive: true,
            isVerified: true
        };

        if (craftSpecialty) {
            matchStage.craftSpecialty = { $in: craftSpecialty.split(",") };
        }

        if (district) {
            matchStage["workshopLocation.district"] = district;
        }

        if (province) {
            matchStage["address.province"] = province;
        }

        if (minRating) {
            matchStage["rating.average"] = { $gte: parseFloat(minRating) };
        }

        if (experience) {
            matchStage.experience = { $gte: parseInt(experience) };
        }

        if (isAvailable) {
            matchStage.isAvailableForCustomOrders = isAvailable === "true";
        }

        // Text search
        if (q) {
            matchStage.$text = { $search: q };
        }

        pipeline.push({ $match: matchStage });

        // Add text score for search
        if (q) {
            pipeline.push({
                $addFields: {
                    score: { $meta: "textScore" }
                }
            });
        }

        // Add product count
        pipeline.push({
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "artisan",
                as: "products",
                pipeline: [
                    { $match: { isActive: true, status: "active" } }
                ]
            }
        });

        pipeline.push({
            $addFields: {
                activeProductCount: { $size: "$products" }
            }
        });

        // Remove sensitive fields
        pipeline.push({
            $project: {
                password: 0,
                bankDetails: 0,
                "socialMedia.website": 0,
                products: 0
            }
        });

        // Sort
        let sortStage = {};
        if (q) {
            sortStage.score = { $meta: "textScore" };
        }

        if (sort.startsWith("-")) {
            sortStage[sort.substring(1)] = -1;
        } else {
            sortStage[sort] = 1;
        }

        pipeline.push({ $sort: sortStage });

        // Facet for pagination
        pipeline.push({
            $facet: {
                artisans: [
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        });

        const [result] = await Artisan.aggregate(pipeline);
        
        const artisans = result.artisans || [];
        const totalArtisans = result.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalArtisans / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                artisans,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalArtisans,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                },
                filters: {
                    query: q,
                    craftSpecialty,
                    district,
                    province,
                    minRating,
                    experience,
                    isAvailable
                }
            }
        });

    } catch (error) {
        console.error("Search artisans error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Artisan Reviews
export const getArtisanReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, sort = "-createdAt" } = req.query;

        const artisanId = id || req.user._id;

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const reviews = await Review.find({
            artisan: artisanId,
            status: "approved",
            isVisible: true
        })
        .populate("reviewer", "firstName lastName")
        .populate("product", "name images")
        .sort(sortObject)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

        const totalReviews = await Review.countDocuments({
            artisan: artisanId,
            status: "approved",
            isVisible: true
        });

        const reviewStats = await Review.getReviewStats(artisanId, "artisan");

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
        console.error("Get artisan reviews error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};