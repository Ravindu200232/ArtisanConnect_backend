import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Artisan from "../models/Artisan.js";
import mongoose from "mongoose";

// Get Customer Dashboard Data
export const getDashboardData = async (req, res) => {
    try {
        const customerId = req.user._id;

        // Get customer with populated data
        const customer = await Customer.findById(customerId)
            .populate("wishlist.product", "name images pricing artisan category")
            .populate("statistics.favoriteArtisan", "firstName lastName businessInfo.businessName craftSpecialty");

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: "Customer not found",
                code: "CUSTOMER_NOT_FOUND"
            });
        }

        // Get recent orders
        const recentOrders = await Order.find({ customer: customerId })
            .populate("items.product", "name images")
            .populate("items.artisan", "firstName lastName businessInfo.businessName")
            .sort({ createdAt: -1 })
            .limit(5);

        // Get recommended products based on preferences and purchase history
        const recommendedProducts = await Product.aggregate([
            {
                $match: {
                    isActive: true,
                    status: "active",
                    category: { $in: customer.preferences.craftTypes || [] }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "artisan",
                    foreignField: "_id",
                    as: "artisan"
                }
            },
            { $unwind: "$artisan" },
            {
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: ["$rating.average", 0.4] },
                            { $multiply: ["$sales.totalSold", 0.0001] },
                            { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] }
                        ]
                    }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 12 },
            {
                $project: {
                    name: 1,
                    images: 1,
                    pricing: 1,
                    category: 1,
                    rating: 1,
                    "artisan.firstName": 1,
                    "artisan.lastName": 1,
                    "artisan.businessInfo.businessName": 1
                }
            }
        ]);

        // Get order statistics
        const orderStats = await Order.aggregate([
            { $match: { customer: customerId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$pricing.totalAmount" }
                }
            }
        ]);

        const ordersByStatus = {};
        orderStats.forEach(stat => {
            ordersByStatus[stat._id] = {
                count: stat.count,
                totalAmount: stat.totalAmount
            };
        });

        // Get favorite artisans (most purchased from)
        const favoriteArtisans = await Order.aggregate([
            { $match: { customer: customerId, status: "completed" } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.artisan",
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$items.totalPrice" },
                    lastOrderDate: { $max: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "artisan",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                "businessInfo.businessName": 1,
                                craftSpecialty: 1,
                                profileImage: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$artisan" },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 }
        ]);

        const dashboardData = {
            customer: customer.toJSON(),
            recentOrders,
            recommendedProducts,
            favoriteArtisans,
            statistics: {
                orders: ordersByStatus,
                loyaltyPoints: customer.loyalty.points,
                loyaltyTier: customer.loyalty.tier,
                totalSpent: customer.statistics.totalSpent,
                totalOrders: customer.statistics.totalOrders
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Get customer dashboard data error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Customer Profile
export const updateCustomerProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            "preferences", "culturalInterests", "communicationPreferences"
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

        const customer = await Customer.findByIdAndUpdate(
            req.user._id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Customer profile updated successfully",
            data: {
                customer: customer.toJSON()
            }
        });

    } catch (error) {
        console.error("Update customer profile error:", error);

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

// Add/Remove Product from Wishlist
export const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid product ID",
                code: "INVALID_ID"
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found",
                code: "PRODUCT_NOT_FOUND"
            });
        }

        const customer = await Customer.findById(req.user._id);
        const existingWishlistItem = customer.wishlist.find(
            item => item.product.toString() === productId
        );

        if (existingWishlistItem) {
            // Remove from wishlist
            customer.wishlist = customer.wishlist.filter(
                item => item.product.toString() !== productId
            );
            await customer.save();

            return res.status(200).json({
                success: true,
                message: "Product removed from wishlist",
                data: {
                    action: "removed",
                    wishlistCount: customer.wishlist.length
                }
            });
        } else {
            // Add to wishlist
            customer.wishlist.push({ product: productId });
            await customer.save();

            return res.status(200).json({
                success: true,
                message: "Product added to wishlist",
                data: {
                    action: "added",
                    wishlistCount: customer.wishlist.length
                }
            });
        }

    } catch (error) {
        console.error("Toggle wishlist error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Customer Wishlist
export const getWishlist = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const customer = await Customer.findById(req.user._id)
            .populate({
                path: "wishlist.product",
                populate: {
                    path: "artisan",
                    select: "firstName lastName businessInfo.businessName"
                }
            });

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: "Customer not found",
                code: "CUSTOMER_NOT_FOUND"
            });
        }

        // Filter out null products (in case product was deleted)
        const validWishlistItems = customer.wishlist.filter(item => item.product);

        // Apply pagination
        const paginatedWishlist = validWishlistItems
            .slice(skip, skip + parseInt(limit));

        const totalItems = validWishlistItems.length;
        const totalPages = Math.ceil(totalItems / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                wishlist: paginatedWishlist,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Add Shipping Address
export const addShippingAddress = async (req, res) => {
    try {
        const { label, street, city, province, country, postalCode, isDefault } = req.body;

        if (!label || !street || !city || !province || !postalCode) {
            return res.status(400).json({
                success: false,
                error: "All address fields are required",
                code: "MISSING_ADDRESS_FIELDS"
            });
        }

        const customer = await Customer.findById(req.user._id);

        // If this is set as default, unset other default addresses
        if (isDefault) {
            customer.shippingAddresses.forEach(address => {
                address.isDefault = false;
            });
        }

        // Add new address
        customer.shippingAddresses.push({
            label,
            street,
            city,
            province,
            country: country || "Sri Lanka",
            postalCode,
            isDefault: isDefault || customer.shippingAddresses.length === 0 // First address is default
        });

        await customer.save();

        res.status(201).json({
            success: true,
            message: "Shipping address added successfully",
            data: {
                addresses: customer.shippingAddresses
            }
        });

    } catch (error) {
        console.error("Add shipping address error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Shipping Address
export const updateShippingAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const updates = req.body;

        const customer = await Customer.findById(req.user._id);
        const address = customer.shippingAddresses.id(addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                error: "Address not found",
                code: "ADDRESS_NOT_FOUND"
            });
        }

        // If setting as default, unset other defaults
        if (updates.isDefault) {
            customer.shippingAddresses.forEach(addr => {
                if (addr._id.toString() !== addressId) {
                    addr.isDefault = false;
                }
            });
        }

        // Update address fields
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                address[key] = updates[key];
            }
        });

        await customer.save();

        res.status(200).json({
            success: true,
            message: "Address updated successfully",
            data: {
                addresses: customer.shippingAddresses
            }
        });

    } catch (error) {
        console.error("Update shipping address error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Delete Shipping Address
export const deleteShippingAddress = async (req, res) => {
    try {
        const { addressId } = req.params;

        const customer = await Customer.findById(req.user._id);
        const address = customer.shippingAddresses.id(addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                error: "Address not found",
                code: "ADDRESS_NOT_FOUND"
            });
        }

        const wasDefault = address.isDefault;
        address.remove();

        // If deleted address was default, make first remaining address default
        if (wasDefault && customer.shippingAddresses.length > 0) {
            customer.shippingAddresses[0].isDefault = true;
        }

        await customer.save();

        res.status(200).json({
            success: true,
            message: "Address deleted successfully",
            data: {
                addresses: customer.shippingAddresses
            }
        });

    } catch (error) {
        console.error("Delete shipping address error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Customer Purchase History with Analytics
export const getPurchaseHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, artisan, dateFrom, dateTo } = req.query;

        // Build filter
        const filter = { customer: req.user._id };
        
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        // Get orders with populated data
        const orders = await Order.find(filter)
            .populate({
                path: "items.product",
                match: category ? { category } : {},
                populate: {
                    path: "artisan",
                    select: "firstName lastName businessInfo.businessName",
                    match: artisan ? { _id: artisan } : {}
                }
            })
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        // Filter orders based on populated criteria
        const filteredOrders = orders.filter(order => {
            if (category || artisan) {
                return order.items.some(item => 
                    item.product && 
                    (!category || item.product.category === category) &&
                    (!artisan || item.product.artisan._id.toString() === artisan)
                );
            }
            return true;
        });

        // Calculate analytics
        const analytics = await Order.aggregate([
            { $match: { customer: req.user._id, ...filter } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: {
                        category: "$productInfo.category",
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    totalSpent: { $sum: "$items.totalPrice" },
                    itemsPurchased: { $sum: "$items.quantity" }
                }
            },
            {
                $group: {
                    _id: "$_id.category",
                    totalSpent: { $sum: "$totalSpent" },
                    totalItems: { $sum: "$itemsPurchased" },
                    monthlyData: {
                        $push: {
                            month: "$_id.month",
                            year: "$_id.year",
                            spent: "$totalSpent",
                            items: "$itemsPurchased"
                        }
                    }
                }
            },
            { $sort: { totalSpent: -1 } }
        ]);

        const totalOrders = await Order.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                orders: filteredOrders,
                analytics,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalOrders / parseInt(limit)),
                    totalOrders,
                    hasNextPage: parseInt(page) < Math.ceil(totalOrders / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get purchase history error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Personalized Recommendations
export const getRecommendations = async (req, res) => {
    try {
        const { limit = 12 } = req.query;
        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: "Customer not found",
                code: "CUSTOMER_NOT_FOUND"
            });
        }

        // Get customer's purchase history for better recommendations
        const purchaseHistory = await Order.find({
            customer: req.user._id,
            status: "completed"
        }).populate("items.product", "category artisan");

        // Extract categories and artisans from purchase history
        const preferredCategories = new Set(customer.preferences.craftTypes || []);
        const purchasedArtisans = new Set();

        purchaseHistory.forEach(order => {
            order.items.forEach(item => {
                if (item.product) {
                    preferredCategories.add(item.product.category);
                    purchasedArtisans.add(item.product.artisan.toString());
                }
            });
        });

        // Build recommendation query
        const recommendations = await Product.aggregate([
            {
                $match: {
                    isActive: true,
                    status: "active",
                    $or: [
                        { category: { $in: Array.from(preferredCategories) } },
                        { artisan: { $in: Array.from(purchasedArtisans).map(id => new mongoose.Types.ObjectId(id)) } },
                        { isFeatured: true },
                        { "rating.average": { $gte: 4 } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "artisan",
                    foreignField: "_id",
                    as: "artisan"
                }
            },
            { $unwind: "$artisan" },
            {
                $addFields: {
                    relevanceScore: {
                        $add: [
                            // Category preference score
                            {
                                $cond: [
                                    { $in: ["$category", Array.from(preferredCategories)] },
                                    3,
                                    0
                                ]
                            },
                            // Previous artisan score
                            {
                                $cond: [
                                    { $in: ["$artisan._id", Array.from(purchasedArtisans).map(id => new mongoose.Types.ObjectId(id))] },
                                    2,
                                    0
                                ]
                            },
                            // Rating score
                            { $multiply: ["$rating.average", 0.5] },
                            // Featured product score
                            { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] },
                            // Random factor for variety
                            { $multiply: [{ $rand: {} }, 0.5] }
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    name: 1,
                    images: 1,
                    pricing: 1,
                    category: 1,
                    rating: 1,
                    "artisan.firstName": 1,
                    "artisan.lastName": 1,
                    "artisan.businessInfo.businessName": 1,
                    relevanceScore: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                recommendations,
                recommendationFactors: {
                    preferredCategories: Array.from(preferredCategories),
                    purchasedFromArtisans: purchasedArtisans.size,
                    totalPurchases: purchaseHistory.length
                }
            }
        });

    } catch (error) {
        console.error("Get recommendations error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};