import { TourismProvider, TourismPackage } from "../models/Tourism.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

// Create Tourism Package (Tourism Provider only)
export const createTourismPackage = async (req, res) => {
    try {
        const packageData = {
            ...req.body,
            provider: req.user._id
        };

        const tourismPackage = new TourismPackage(packageData);
        await tourismPackage.save();

        await tourismPackage.populate("provider", "companyName firstName lastName serviceTypes");

        res.status(201).json({
            success: true,
            message: "Tourism package created successfully",
            data: {
                package: tourismPackage
            }
        });

    } catch (error) {
        console.error("Create tourism package error:", error);

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

// Get All Tourism Packages (Public)
export const getAllTourismPackages = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = "-createdAt",
            type,
            category,
            region,
            maxPrice,
            minRating,
            duration,
            search,
            isFeatured
        } = req.query;

        // Build filter object
        const filter = { isActive: true };

        if (type) filter.type = type;
        if (category) filter.category = category;
        if (isFeatured) filter.isFeatured = isFeatured === "true";

        // Price filter
        if (maxPrice) {
            filter["pricing.basePrice"] = { $lte: parseFloat(maxPrice) };
        }

        // Rating filter
        if (minRating) {
            filter["rating.average"] = { $gte: parseFloat(minRating) };
        }

        // Duration filter
        if (duration) {
            const [minDuration, maxDuration] = duration.split("-").map(Number);
            filter["duration.value"] = {};
            if (minDuration) filter["duration.value"].$gte = minDuration;
            if (maxDuration) filter["duration.value"].$lte = maxDuration;
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
        const packages = await TourismPackage.find(filter)
            .populate("provider", "companyName firstName lastName rating serviceTypes operatingRegions")
            .populate("itinerary.includedArtisans.artisan", "firstName lastName craftSpecialty")
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Filter by region if specified (based on provider's operating regions)
        let filteredPackages = packages;
        if (region) {
            filteredPackages = packages.filter(pkg => 
                pkg.provider.operatingRegions?.some(r => r.province === region)
            );
        }

        // Get total count for pagination
        const totalPackages = await TourismPackage.countDocuments(filter);
        const totalPages = Math.ceil(totalPackages / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                packages: filteredPackages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPackages,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get tourism packages error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Tourism Package by ID (Public)
export const getTourismPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid package ID",
                code: "INVALID_ID"
            });
        }

        const tourismPackage = await TourismPackage.findOne({ _id: id, isActive: true })
            .populate("provider", "companyName firstName lastName rating serviceTypes languages teamMembers")
            .populate("itinerary.includedArtisans.artisan", "firstName lastName craftSpecialty workshopLocation businessInfo")
            .lean();

        if (!tourismPackage) {
            return res.status(404).json({
                success: false,
                error: "Tourism package not found",
                code: "PACKAGE_NOT_FOUND"
            });
        }

        // Get related packages from same provider
        const relatedPackages = await TourismPackage.find({
            _id: { $ne: tourismPackage._id },
            provider: tourismPackage.provider._id,
            isActive: true
        })
        .limit(4)
        .populate("provider", "companyName firstName lastName")
        .lean();

        // Get similar packages in same category
        const similarPackages = await TourismPackage.find({
            _id: { $ne: tourismPackage._id },
            category: tourismPackage.category,
            isActive: true
        })
        .sort({ "rating.average": -1 })
        .limit(6)
        .populate("provider", "companyName firstName lastName")
        .lean();

        res.status(200).json({
            success: true,
            data: {
                package: tourismPackage,
                relatedPackages,
                similarPackages
            }
        });

    } catch (error) {
        console.error("Get tourism package by ID error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Tourism Package (Tourism Provider only)
export const updateTourismPackage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid package ID",
                code: "INVALID_ID"
            });
        }

        // Find package and check ownership
        const tourismPackage = await TourismPackage.findById(id);
        
        if (!tourismPackage) {
            return res.status(404).json({
                success: false,
                error: "Tourism package not found",
                code: "PACKAGE_NOT_FOUND"
            });
        }

        if (tourismPackage.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only update your own packages",
                code: "ACCESS_DENIED"
            });
        }

        // Update package
        const updatedPackage = await TourismPackage.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate("provider", "companyName firstName lastName serviceTypes");

        res.status(200).json({
            success: true,
            message: "Tourism package updated successfully",
            data: {
                package: updatedPackage
            }
        });

    } catch (error) {
        console.error("Update tourism package error:", error);

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

// Delete Tourism Package (Tourism Provider only)
export const deleteTourismPackage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid package ID",
                code: "INVALID_ID"
            });
        }

        // Find package and check ownership
        const tourismPackage = await TourismPackage.findById(id);
        
        if (!tourismPackage) {
            return res.status(404).json({
                success: false,
                error: "Tourism package not found",
                code: "PACKAGE_NOT_FOUND"
            });
        }

        if (tourismPackage.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: "You can only delete your own packages",
                code: "ACCESS_DENIED"
            });
        }

        // Soft delete - set isActive to false
        await TourismPackage.findByIdAndUpdate(id, { 
            isActive: false,
            updatedAt: new Date() 
        });

        res.status(200).json({
            success: true,
            message: "Tourism package deleted successfully"
        });

    } catch (error) {
        console.error("Delete tourism package error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Tourism Provider's Packages
export const getProviderPackages = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, sort = "-createdAt" } = req.query;
        
        // Build filter
        const filter = { 
            provider: req.user._id,
            isActive: true 
        };

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const packages = await TourismPackage.find(filter)
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalPackages = await TourismPackage.countDocuments(filter);
        const totalPages = Math.ceil(totalPackages / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                packages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPackages,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get provider packages error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Check Package Availability
export const checkAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, participants } = req.query;

        if (!date || !participants) {
            return res.status(400).json({
                success: false,
                error: "Date and participants are required",
                code: "MISSING_PARAMETERS"
            });
        }

        const tourismPackage = await TourismPackage.findById(id);
        
        if (!tourismPackage) {
            return res.status(404).json({
                success: false,
                error: "Tourism package not found",
                code: "PACKAGE_NOT_FOUND"
            });
        }

        const isAvailable = tourismPackage.checkAvailability(date, parseInt(participants));
        const price = tourismPackage.calculatePrice(parseInt(participants), date);

        res.status(200).json({
            success: true,
            data: {
                isAvailable,
                price,
                participants: parseInt(participants),
                date,
                pricePerPerson: price / parseInt(participants)
            }
        });

    } catch (error) {
        console.error("Check availability error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Tourism Dashboard Data (Tourism Provider only)
export const getDashboardData = async (req, res) => {
    try {
        const providerId = req.user._id;

        // Get basic statistics
        const [packageStats, bookingStats] = await Promise.all([
            // Package statistics
            TourismPackage.aggregate([
                { $match: { provider: providerId, isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalPackages: { $sum: 1 },
                        featuredPackages: { 
                            $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] } 
                        },
                        avgRating: { $avg: "$rating.average" },
                        totalBookings: { $sum: "$statistics.totalBookings" },
                        totalRevenue: { $sum: "$statistics.totalRevenue" },
                        totalParticipants: { $sum: "$statistics.totalParticipants" }
                    }
                }
            ]),

            // Recent bookings would be implemented with booking system
            // For now, placeholder data structure
            Promise.resolve([])
        ]);

        // Get package performance
        const packagePerformance = await TourismPackage.find({
            provider: providerId,
            isActive: true
        })
        .select("title type category rating statistics pricing")
        .sort({ "statistics.totalRevenue": -1 })
        .limit(10);

        // Get monthly revenue trend (placeholder - would integrate with booking system)
        const monthlyRevenue = await TourismPackage.aggregate([
            { $match: { provider: providerId, isActive: true } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    packages: { $sum: 1 },
                    revenue: { $sum: "$statistics.totalRevenue" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        const dashboardData = {
            statistics: packageStats[0] || {
                totalPackages: 0,
                featuredPackages: 0,
                avgRating: 0,
                totalBookings: 0,
                totalRevenue: 0,
                totalParticipants: 0
            },
            packagePerformance,
            monthlyRevenue,
            recentBookings: [] // Would be populated with actual booking data
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Get tourism dashboard data error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Featured Tourism Packages
export const getFeaturedPackages = async (req, res) => {
    try {
        const { limit = 8 } = req.query;

        const featuredPackages = await TourismPackage.find({
            isFeatured: true,
            isActive: true
        })
        .populate("provider", "companyName firstName lastName serviceTypes")
        .sort({ "rating.average": -1, "statistics.totalBookings": -1 })
        .limit(parseInt(limit))
        .lean();

        res.status(200).json({
            success: true,
            data: {
                packages: featuredPackages
            }
        });

    } catch (error) {
        console.error("Get featured packages error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Search Tourism Packages
export const searchTourismPackages = async (req, res) => {
    try {
        const {
            q, // search query
            type,
            category,
            region,
            duration,
            maxPrice,
            minRating,
            includedFeatures,
            page = 1,
            limit = 20,
            sort = "-rating.average"
        } = req.query;

        // Build aggregation pipeline
        const pipeline = [];

        // Match stage
        const matchStage = {
            isActive: true
        };

        if (type) matchStage.type = type;
        if (category) matchStage.category = category;
        if (maxPrice) matchStage["pricing.basePrice"] = { $lte: parseFloat(maxPrice) };
        if (minRating) matchStage["rating.average"] = { $gte: parseFloat(minRating) };

        // Duration filter
        if (duration) {
            const [minDuration, maxDuration] = duration.split("-").map(Number);
            matchStage["duration.value"] = {};
            if (minDuration) matchStage["duration.value"].$gte = minDuration;
            if (maxDuration) matchStage["duration.value"].$lte = maxDuration;
        }

        // Text search
        if (q) {
            matchStage.$text = { $search: q };
        }

        // Included features filter
        if (includedFeatures) {
            const features = includedFeatures.split(",");
            const featureConditions = [];
            
            features.forEach(feature => {
                switch (feature) {
                    case "transportation":
                        featureConditions.push({ "inclusions.transportation": true });
                        break;
                    case "meals":
                        featureConditions.push({ "inclusions.meals": { $exists: true, $ne: [] } });
                        break;
                    case "materials":
                        featureConditions.push({ "inclusions.materials": true });
                        break;
                    case "accommodation":
                        featureConditions.push({ "inclusions.accommodation": true });
                        break;
                }
            });

            if (featureConditions.length > 0) {
                matchStage.$and = featureConditions;
            }
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

        // Populate provider data
        pipeline.push({
            $lookup: {
                from: "users",
                localField: "provider",
                foreignField: "_id",
                as: "provider",
                pipeline: [
                    {
                        $project: {
                            companyName: 1,
                            firstName: 1,
                            lastName: 1,
                            serviceTypes: 1,
                            operatingRegions: 1,
                            rating: 1
                        }
                    }
                ]
            }
        });

        pipeline.push({
            $unwind: "$provider"
        });

        // Region filter (based on provider's operating regions)
        if (region) {
            pipeline.push({
                $match: {
                    "provider.operatingRegions.province": region
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
                packages: [
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        });

        const [result] = await TourismPackage.aggregate(pipeline);
        
        const packages = result.packages || [];
        const totalPackages = result.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalPackages / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                packages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPackages,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                },
                filters: {
                    query: q,
                    type,
                    category,
                    region,
                    duration,
                    maxPrice,
                    minRating,
                    includedFeatures
                }
            }
        });

    } catch (error) {
        console.error("Search tourism packages error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};