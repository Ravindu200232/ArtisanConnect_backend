import Supplier from "../models/Supplier.js";
import Material from "../models/Material.js";
import mongoose from "mongoose";

// Get All Suppliers (Public)
export const getAllSuppliers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = "-rating.overall",
            materialSpecialty,
            region,
            verified,
            minRating,
            search
        } = req.query;

        // Build filter object
        const filter = { 
            isActive: true 
        };

        if (materialSpecialty) {
            filter.materialSpecialties = { $in: materialSpecialty.split(",") };
        }

        if (region) {
            filter["address.province"] = region;
        }

        if (verified) {
            filter.isVerified = verified === "true";
        }

        if (minRating) {
            filter["rating.overall"] = { $gte: parseFloat(minRating) };
        }

        // Search functionality
        if (search) {
            filter.$or = [
                { companyName: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { materialSpecialties: { $in: [new RegExp(search, "i")] } }
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
        const suppliers = await Supplier.find(filter)
            .select("-password -bankDetails -verificationDocuments")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get material count for each supplier
        const suppliersWithMaterials = await Promise.all(
            suppliers.map(async (supplier) => {
                const materialCount = await Material.countDocuments({
                    supplier: supplier._id,
                    isActive: true,
                    isAvailable: true
                });

                return {
                    ...supplier,
                    activeMaterialCount: materialCount
                };
            })
        );

        // Get total count for pagination
        const totalSuppliers = await Supplier.countDocuments(filter);
        const totalPages = Math.ceil(totalSuppliers / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                suppliers: suppliersWithMaterials,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalSuppliers,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get all suppliers error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Supplier by ID (Public)
export const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid supplier ID",
                code: "INVALID_ID"
            });
        }

        const supplier = await Supplier.findOne({ 
            _id: id, 
            isActive: true 
        })
        .select("-password -bankDetails -verificationDocuments")
        .lean();

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: "Supplier not found",
                code: "SUPPLIER_NOT_FOUND"
            });
        }

        // Get supplier's materials
        const materials = await Material.find({
            supplier: id,
            isActive: true,
            isAvailable: true
        })
        .select("name category pricing inventory quality images")
        .sort({ "quality.qualityScore": -1 })
        .limit(20)
        .lean();

        res.status(200).json({
            success: true,
            data: {
                supplier,
                materials
            }
        });

    } catch (error) {
        console.error("Get supplier by ID error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Supplier Dashboard Data
export const getDashboardData = async (req, res) => {
    try {
        const supplierId = req.user._id;

        // Get basic statistics
        const [materialStats, contractStats] = await Promise.all([
            // Material statistics
            Material.aggregate([
                { $match: { supplier: supplierId, isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalMaterials: { $sum: 1 },
                        activeMaterials: { 
                            $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] } 
                        },
                        lowStockMaterials: {
                            $sum: {
                                $cond: [
                                    { $lte: ["$inventory.currentStock", "$inventory.reorderLevel"] },
                                    1,
                                    0
                                ]
                            }
                        },
                        totalRevenue: { $sum: "$usage.totalRevenue" },
                        totalOrdered: { $sum: "$usage.totalOrdered" },
                        avgQualityScore: { $avg: "$quality.qualityScore" }
                    }
                }
            ]),

            // Contract statistics
            Supplier.aggregate([
                { $match: { _id: supplierId } },
                {
                    $project: {
                        contractedArtisansCount: { $size: "$contractedArtisans" }
                    }
                }
            ])
        ]);

        // Get low stock materials
        const lowStockMaterials = await Material.find({
            supplier: supplierId,
            isActive: true,
            $expr: { $lte: ["$inventory.currentStock", "$inventory.reorderLevel"] }
        })
        .select("name category inventory pricing")
        .limit(10);

        // Get recent material usage
        const recentActivity = await Material.find({
            supplier: supplierId,
            "usage.lastOrderDate": { $exists: true }
        })
        .select("name category usage.lastOrderDate usage.totalOrdered")
        .sort({ "usage.lastOrderDate": -1 })
        .limit(10);

        // Get monthly revenue trend (last 12 months)
        const monthlyRevenue = await Material.aggregate([
            { $match: { supplier: supplierId } },
            {
                $match: {
                    "usage.lastOrderDate": {
                        $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$usage.lastOrderDate" },
                        month: { $month: "$usage.lastOrderDate" }
                    },
                    revenue: { $sum: "$usage.totalRevenue" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        const dashboardData = {
            statistics: {
                materials: materialStats[0] || {
                    totalMaterials: 0,
                    activeMaterials: 0,
                    lowStockMaterials: 0,
                    totalRevenue: 0,
                    totalOrdered: 0,
                    avgQualityScore: 0
                },
                contractedArtisans: contractStats[0]?.contractedArtisansCount || 0
            },
            lowStockMaterials,
            recentActivity,
            monthlyRevenue
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Get supplier dashboard data error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Supplier Profile
export const updateSupplierProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            "companyName", "materialSpecialties", "warehouse", "businessInfo",
            "paymentTerms", "delivery", "sustainability"
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

        const supplier = await Supplier.findByIdAndUpdate(
            req.user._id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select("-password -bankDetails -verificationDocuments");

        res.status(200).json({
            success: true,
            message: "Supplier profile updated successfully",
            data: {
                supplier
            }
        });

    } catch (error) {
        console.error("Update supplier profile error:", error);

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

// Add Contracted Artisan
export const addContractedArtisan = async (req, res) => {
    try {
        const { artisanId, preferredMaterials, volumeDiscount } = req.body;

        if (!mongoose.Types.ObjectId.isValid(artisanId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid artisan ID",
                code: "INVALID_ID"
            });
        }

        const supplier = await Supplier.findById(req.user._id);
        
        // Check if artisan is already contracted
        const existingContract = supplier.contractedArtisans.find(
            contract => contract.artisan.toString() === artisanId
        );

        if (existingContract) {
            return res.status(409).json({
                success: false,
                error: "Artisan is already contracted",
                code: "ARTISAN_ALREADY_CONTRACTED"
            });
        }

        // Add new contract
        supplier.contractedArtisans.push({
            artisan: artisanId,
            contractStartDate: new Date(),
            preferredMaterials: preferredMaterials || [],
            volumeDiscount: volumeDiscount || 0
        });

        await supplier.save();

        // Populate the new contract data
        await supplier.populate("contractedArtisans.artisan", "firstName lastName businessInfo.businessName craftSpecialty");

        res.status(201).json({
            success: true,
            message: "Artisan contract added successfully",
            data: {
                contractedArtisans: supplier.contractedArtisans
            }
        });

    } catch (error) {
        console.error("Add contracted artisan error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Remove Contracted Artisan
export const removeContractedArtisan = async (req, res) => {
    try {
        const { artisanId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(artisanId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid artisan ID",
                code: "INVALID_ID"
            });
        }

        const supplier = await Supplier.findById(req.user._id);
        
        const contractIndex = supplier.contractedArtisans.findIndex(
            contract => contract.artisan.toString() === artisanId
        );

        if (contractIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Artisan contract not found",
                code: "CONTRACT_NOT_FOUND"
            });
        }

        // Remove the contract
        supplier.contractedArtisans.splice(contractIndex, 1);
        await supplier.save();

        res.status(200).json({
            success: true,
            message: "Artisan contract removed successfully",
            data: {
                contractedArtisans: supplier.contractedArtisans
            }
        });

    } catch (error) {
        console.error("Remove contracted artisan error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Supplier Materials
export const getSupplierMaterials = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, status, sort = "-createdAt" } = req.query;
        
        // Build filter
        const filter = { 
            supplier: req.user._id,
            isActive: true 
        };

        if (category) filter.category = category;
        if (status === "available") filter.isAvailable = true;
        else if (status === "unavailable") filter.isAvailable = false;

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const materials = await Material.find(filter)
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalMaterials = await Material.countDocuments(filter);
        const totalPages = Math.ceil(totalMaterials / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                materials,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalMaterials,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get supplier materials error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Supplier Analytics
export const getAnalytics = async (req, res) => {
    try {
        const { period = "month" } = req.query;
        const supplierId = req.user._id;

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

        // Material performance analytics
        const materialAnalytics = await Material.aggregate([
            { $match: { supplier: supplierId, isActive: true } },
            {
                $project: {
                    name: 1,
                    category: 1,
                    "pricing.unitPrice": 1,
                    "usage.totalOrdered": 1,
                    "usage.totalRevenue": 1,
                    "quality.qualityScore": 1,
                    "inventory.currentStock": 1,
                    "demandForecasting.trendingScore": 1,
                    turnoverRate: {
                        $cond: [
                            { $eq: ["$inventory.currentStock", 0] },
                            0,
                            { $divide: ["$usage.totalOrdered", "$inventory.currentStock"] }
                        ]
                    }
                }
            },
            { $sort: { "usage.totalRevenue": -1 } }
        ]);

        // Category performance
        const categoryAnalytics = await Material.aggregate([
            { $match: { supplier: supplierId, isActive: true } },
            {
                $group: {
                    _id: "$category",
                    totalMaterials: { $sum: 1 },
                    totalRevenue: { $sum: "$usage.totalRevenue" },
                    totalOrdered: { $sum: "$usage.totalOrdered" },
                    avgQualityScore: { $avg: "$quality.qualityScore" },
                    avgPrice: { $avg: "$pricing.unitPrice" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                period,
                materialAnalytics,
                categoryAnalytics
            }
        });

    } catch (error) {
        console.error("Get supplier analytics error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};