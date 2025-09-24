import Material from "../models/Material.js";
import Supplier from "../models/Supplier.js";
import mongoose from "mongoose";

// Create Material (Supplier only)
export const createMaterial = async (req, res) => {
    try {
        const materialData = {
            ...req.body,
            supplier: req.user._id
        };

        const material = new Material(materialData);
        await material.save();

        await material.populate("supplier", "companyName firstName lastName materialSpecialties");

        res.status(201).json({
            success: true,
            message: "Material created successfully",
            data: {
                material
            }
        });

    } catch (error) {
        console.error("Create material error:", error);

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

// Get All Materials with Filtering and Pagination
export const getAllMaterials = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = "-createdAt",
            category,
            subcategory,
            supplier,
            minPrice,
            maxPrice,
            qualityGrade,
            sustainabilityRating,
            isEcoFriendly,
            inStock,
            search
        } = req.query;

        // Build filter object
        const filter = { isActive: true, isAvailable: true };

        if (category) filter.category = category;
        if (subcategory) filter.subcategory = subcategory;
        if (supplier) filter.supplier = supplier;
        if (qualityGrade) filter["quality.qualityGrade"] = qualityGrade;
        if (sustainabilityRating) filter["sustainability.sustainabilityRating"] = sustainabilityRating;
        if (isEcoFriendly) filter["sustainability.isEcoFriendly"] = isEcoFriendly === "true";
        if (inStock === "true") filter["inventory.currentStock"] = { $gt: 0 };

        // Price range filter
        if (minPrice || maxPrice) {
            filter["pricing.unitPrice"] = {};
            if (minPrice) filter["pricing.unitPrice"].$gte = parseFloat(minPrice);
            if (maxPrice) filter["pricing.unitPrice"].$lte = parseFloat(maxPrice);
        }

        // Search functionality
        if (search) {
            filter.$text = { $search: search };
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

        // Add text score for search sorting
        if (search) {
            sortObject = { score: { $meta: "textScore" }, ...sortObject };
        }

        // Execute query with population
        const materials = await Material.find(filter)
            .populate("supplier", "companyName firstName lastName rating address.province")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
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
        console.error("Get materials error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Material by ID
export const getMaterialById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid material ID",
                code: "INVALID_ID"
            });
        }

        const material = await Material.findOne({ _id: id, isActive: true })
            .populate("supplier", "companyName firstName lastName rating paymentTerms delivery contactInfo")
            .lean();

        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
                code: "MATERIAL_NOT_FOUND"
            });
        }

        // Get related materials from same supplier
        const relatedMaterials = await Material.find({
            _id: { $ne: material._id },
            supplier: material.supplier._id,
            isActive: true,
            isAvailable: true
        })
        .limit(6)
        .populate("supplier", "companyName firstName lastName")
        .lean();

        // Get similar materials in same category
        const similarMaterials = await Material.find({
            _id: { $ne: material._id },
            category: material.category,
            isActive: true,
            isAvailable: true
        })
        .sort({ "quality.qualityScore": -1 })
        .limit(6)
        .populate("supplier", "companyName firstName lastName")
        .lean();

        res.status(200).json({
            success: true,
            data: {
                material,
                relatedMaterials,
                similarMaterials
            }
        });

    } catch (error) {
        console.error("Get material by ID error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Material (Supplier only - own materials)
export const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid material ID",
                code: "INVALID_ID"
            });
        }

        // Find material and check ownership
        const material = await Material.findById(id);
        
        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
                code: "MATERIAL_NOT_FOUND"
            });
        }

        if (material.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only update your own materials",
                code: "ACCESS_DENIED"
            });
        }

        // Update material
        const updatedMaterial = await Material.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate("supplier", "companyName firstName lastName");

        res.status(200).json({
            success: true,
            message: "Material updated successfully",
            data: {
                material: updatedMaterial
            }
        });

    } catch (error) {
        console.error("Update material error:", error);

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

// Delete Material (Supplier only - own materials)
export const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid material ID",
                code: "INVALID_ID"
            });
        }

        // Find material and check ownership
        const material = await Material.findById(id);
        
        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
                code: "MATERIAL_NOT_FOUND"
            });
        }

        if (material.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only delete your own materials",
                code: "ACCESS_DENIED"
            });
        }

        // Soft delete - set isActive to false
        await Material.findByIdAndUpdate(id, { 
            isActive: false, 
            isAvailable: false,
            updatedAt: new Date() 
        });

        res.status(200).json({
            success: true,
            message: "Material deleted successfully"
        });

    } catch (error) {
        console.error("Delete material error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Reserve Material Stock
export const reserveStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                error: "Valid quantity is required",
                code: "INVALID_QUANTITY"
            });
        }

        const material = await Material.findById(id);
        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
                code: "MATERIAL_NOT_FOUND"
            });
        }

        if (!material.checkAvailability(quantity)) {
            return res.status(400).json({
                success: false,
                error: "Insufficient stock or below minimum order quantity",
                code: "INSUFFICIENT_STOCK",
                availableStock: material.availableStock,
                minimumOrderQuantity: material.pricing.minimumOrderQuantity
            });
        }

        const success = await material.reserveStock(quantity);
        
        if (!success) {
            return res.status(400).json({
                success: false,
                error: "Could not reserve stock",
                code: "STOCK_RESERVATION_FAILED"
            });
        }

        // Calculate price with bulk discount
        const totalPrice = material.calculatePrice(quantity);

        res.status(200).json({
            success: true,
            message: "Stock reserved successfully",
            data: {
                reservedQuantity: quantity,
                availableStock: material.availableStock,
                totalPrice,
                pricePerUnit: totalPrice / quantity
            }
        });

    } catch (error) {
        console.error("Reserve stock error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Material Categories with Counts
export const getCategories = async (req, res) => {
    try {
        const categories = await Material.aggregate([
            { 
                $match: { 
                    isActive: true, 
                    isAvailable: true 
                } 
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    avgPrice: { $avg: "$pricing.unitPrice" },
                    subcategories: { $addToSet: "$subcategory" },
                    avgQualityScore: { $avg: "$quality.qualityScore" }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                categories
            }
        });

    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Search Materials with Advanced Filters
export const searchMaterials = async (req, res) => {
    try {
        const {
            q, // search query
            category,
            subcategory,
            supplier,
            region,
            qualityGrade,
            sustainabilityRating,
            isEcoFriendly,
            isLocal,
            minPrice,
            maxPrice,
            page = 1,
            limit = 20,
            sort = "-quality.qualityScore"
        } = req.query;

        // Build aggregation pipeline
        const pipeline = [];

        // Match stage
        const matchStage = {
            isActive: true,
            isAvailable: true
        };

        if (category) matchStage.category = category;
        if (subcategory) matchStage.subcategory = subcategory;
        if (supplier) matchStage.supplier = new mongoose.Types.ObjectId(supplier);
        if (qualityGrade) matchStage["quality.qualityGrade"] = qualityGrade;
        if (sustainabilityRating) matchStage["sustainability.sustainabilityRating"] = sustainabilityRating;
        if (isEcoFriendly) matchStage["sustainability.isEcoFriendly"] = isEcoFriendly === "true";
        if (isLocal) matchStage["sustainability.sourceLocation.isLocal"] = isLocal === "true";

        // Price range
        if (minPrice || maxPrice) {
            matchStage["pricing.unitPrice"] = {};
            if (minPrice) matchStage["pricing.unitPrice"].$gte = parseFloat(minPrice);
            if (maxPrice) matchStage["pricing.unitPrice"].$lte = parseFloat(maxPrice);
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

        // Populate supplier data
        pipeline.push({
            $lookup: {
                from: "users",
                localField: "supplier",
                foreignField: "_id",
                as: "supplier",
                pipeline: [
                    {
                        $project: {
                            companyName: 1,
                            firstName: 1,
                            lastName: 1,
                            rating: 1,
                            "address.province": 1
                        }
                    }
                ]
            }
        });

        pipeline.push({
            $unwind: "$supplier"
        });

        // Region filter (based on supplier location)
        if (region) {
            pipeline.push({
                $match: {
                    "supplier.address.province": region
                }
            });
        }

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

        // Facet for pagination and total count
        pipeline.push({
            $facet: {
                materials: [
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        });

        const [result] = await Material.aggregate(pipeline);
        
        const materials = result.materials || [];
        const totalMaterials = result.totalCount[0]?.count || 0;
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
                },
                filters: {
                    query: q,
                    category,
                    subcategory,
                    supplier,
                    region,
                    qualityGrade,
                    sustainabilityRating,
                    isEcoFriendly,
                    isLocal,
                    priceRange: { min: minPrice, max: maxPrice }
                }
            }
        });

    } catch (error) {
        console.error("Search materials error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Stock Level (Supplier only)
export const updateStockLevel = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentStock, reorderLevel } = req.body;

        if (currentStock === undefined || currentStock < 0) {
            return res.status(400).json({
                success: false,
                error: "Valid current stock is required",
                code: "INVALID_STOCK_LEVEL"
            });
        }

        const material = await Material.findById(id);
        
        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
                code: "MATERIAL_NOT_FOUND"
            });
        }

        if (material.supplier.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only update your own materials",
                code: "ACCESS_DENIED"
            });
        }

        // Update stock levels
        material.inventory.currentStock = currentStock;
        if (reorderLevel !== undefined) {
            material.inventory.reorderLevel = reorderLevel;
        }

        // Update availability based on stock
        material.isAvailable = currentStock > 0;
        material.inventory.lastRestockDate = new Date();

        await material.save();

        res.status(200).json({
            success: true,
            message: "Stock level updated successfully",
            data: {
                material: {
                    _id: material._id,
                    name: material.name,
                    inventory: material.inventory,
                    isAvailable: material.isAvailable
                }
            }
        });

    } catch (error) {
        console.error("Update stock level error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Trending Materials
export const getTrendingMaterials = async (req, res) => {
    try {
        const { limit = 12 } = req.query;

        const trendingMaterials = await Material.find({
            isActive: true,
            isAvailable: true
        })
        .populate("supplier", "companyName firstName lastName rating")
        .sort({ "demandForecasting.trendingScore": -1, "usage.totalOrdered": -1 })
        .limit(parseInt(limit))
        .lean();

        res.status(200).json({
            success: true,
            data: {
                materials: trendingMaterials
            }
        });

    } catch (error) {
        console.error("Get trending materials error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};