// controllers/artisanController.js
import Artisan from "../models/artisan.js";
import { Product } from "../models/product.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Role checking functions
export function isItArtisan(req) {
    return req.user != null && req.user.role === "artisan";
}

export function isItAdmin(req) {
    return req.user != null && req.user.role === "admin";
}

// Artisan Registration
export async function registerArtisan(req, res) {
    try {
        const data = req.body;
        
        // Check if email already exists
        const existingArtisan = await Artisan.findOne({ email: data.email });
        if (existingArtisan) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash password
        data.password = await bcrypt.hash(data.password, 10);
        
        // Generate unique artisan ID
        const lastArtisan = await Artisan.find().sort({ artisanId: -1 }).limit(1);
        if (lastArtisan.length === 0) {
            data.artisanId = "ART0001";
        } else {
            const lastId = lastArtisan[0].artisanId.replace("ART", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            data.artisanId = "ART" + newId;
        }

        // Initialize AI insights
        data.aiInsights = {
            performanceScore: 0,
            recommendations: [
                "Upload high-quality product photos",
                "Complete your artisan profile",
                "Add detailed product descriptions with cultural stories"
            ],
            demandForecast: [],
            pricingOptimization: []
        };

        const newArtisan = new Artisan(data);
        await newArtisan.save();

        res.status(201).json({
            message: "Artisan registered successfully",
            artisanId: data.artisanId
        });

    } catch (err) {
        console.error("Artisan registration error:", err);
        res.status(500).json({
            message: "Artisan registration failed",
            error: err.message
        });
    }
}

// Artisan Login
export async function loginArtisan(req, res) {
    try {
        const { email, password } = req.body;

        const artisan = await Artisan.findOne({ email });
        
        if (!artisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        if (artisan.isBlocked) {
            return res.status(403).json({
                message: "Account is blocked. Please contact support."
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, artisan.password);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                artisanId: artisan.artisanId,
                email: artisan.email,
                role: "artisan",
                firstName: artisan.firstName,
                lastName: artisan.lastName,
                businessName: artisan.businessName,
                isVerified: artisan.isVerified
            },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login successful",
            token: token,
            artisan: {
                artisanId: artisan.artisanId,
                email: artisan.email,
                firstName: artisan.firstName,
                lastName: artisan.lastName,
                businessName: artisan.businessName,
                isVerified: artisan.isVerified,
                profileImage: artisan.profileImage
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({
            message: "Login failed",
            error: err.message
        });
    }
}

// Get All Artisans (Admin only)
export async function getAllArtisans(req, res) {
    try {
        if (!isItAdmin(req)) {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        const artisans = await Artisan.find().select("-password");
        
        res.json({
            message: "Artisans fetched successfully",
            count: artisans.length,
            artisans: artisans
        });

    } catch (err) {
        console.error("Get artisans error:", err);
        res.status(500).json({
            message: "Failed to fetch artisans",
            error: err.message
        });
    }
}

// Get Artisan Profile
export async function getArtisanProfile(req, res) {
    try {
        const { artisanId } = req.params;
        
        const artisan = await Artisan.findOne({ artisanId }).select("-password");
        
        if (!artisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        res.json({
            message: "Artisan profile fetched successfully",
            artisan: artisan
        });

    } catch (err) {
        console.error("Get artisan profile error:", err);
        res.status(500).json({
            message: "Failed to fetch artisan profile",
            error: err.message
        });
    }
}

// Update Artisan Profile
export async function updateArtisanProfile(req, res) {
    try {
        const { artisanId } = req.params;
        const updateData = req.body;
        
        // Check if user is the artisan or admin
        if (!isItAdmin(req) && req.user.artisanId !== artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Don't allow password update through this endpoint
        delete updateData.password;
        delete updateData.artisanId;

        const updatedArtisan = await Artisan.findOneAndUpdate(
            { artisanId },
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedArtisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        res.json({
            message: "Profile updated successfully",
            artisan: updatedArtisan
        });

    } catch (err) {
        console.error("Update artisan error:", err);
        res.status(500).json({
            message: "Failed to update profile",
            error: err.message
        });
    }
}

// AI Photo Quality Checker
export async function analyzePhotoQuality(req, res) {
    try {
        if (!isItArtisan(req)) {
            return res.status(403).json({
                message: "Access denied. Artisan only."
            });
        }

        const { imageUrl, productId } = req.body;

        // Simulate AI photo analysis (In production, integrate with TensorFlow Lite or similar)
        const qualityAnalysis = {
            overallScore: Math.floor(Math.random() * 40) + 60, // 60-100
            aspects: {
                brightness: Math.floor(Math.random() * 40) + 60,
                focus: Math.floor(Math.random() * 40) + 60,
                composition: Math.floor(Math.random() * 40) + 60,
                backgroundClarity: Math.floor(Math.random() * 40) + 60,
                colorBalance: Math.floor(Math.random() * 40) + 60
            },
            suggestions: []
        };

        // Generate suggestions based on scores
        if (qualityAnalysis.aspects.brightness < 75) {
            qualityAnalysis.suggestions.push("Improve lighting - use natural light or proper studio lighting");
        }
        if (qualityAnalysis.aspects.focus < 75) {
            qualityAnalysis.suggestions.push("Ensure the product is in sharp focus");
        }
        if (qualityAnalysis.aspects.composition < 75) {
            qualityAnalysis.suggestions.push("Center the product and use rule of thirds");
        }
        if (qualityAnalysis.aspects.backgroundClarity < 75) {
            qualityAnalysis.suggestions.push("Use a clean, neutral background");
        }
        if (qualityAnalysis.aspects.colorBalance < 75) {
            qualityAnalysis.suggestions.push("Adjust color balance for accurate representation");
        }

        // Update product AI data if productId provided
        if (productId) {
            await Product.findOneAndUpdate(
                { productId, artisanId: req.user.artisanId },
                {
                    $push: {
                        "aiData.photoQualityFeedback": {
                            imageUrl: imageUrl,
                            score: qualityAnalysis.overallScore,
                            suggestions: qualityAnalysis.suggestions
                        }
                    }
                }
            );
        }

        res.json({
            message: "Photo analysis completed",
            analysis: qualityAnalysis
        });

    } catch (err) {
        console.error("Photo analysis error:", err);
        res.status(500).json({
            message: "Failed to analyze photo",
            error: err.message
        });
    }
}

// AI Business Intelligence Dashboard
export async function getBusinessInsights(req, res) {
    try {
        if (!isItArtisan(req)) {
            return res.status(403).json({
                message: "Access denied. Artisan only."
            });
        }

        const artisanId = req.user.artisanId;
        
        // Get artisan data
        const artisan = await Artisan.findOne({ artisanId });
        if (!artisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        // Get products data
        const products = await Product.find({ artisanId });
        
        // Calculate performance metrics
        const totalProducts = products.length;
        const totalViews = products.reduce((sum, product) => sum + product.views, 0);
        const totalSales = products.reduce((sum, product) => sum + product.totalSales, 0);
        const averageRating = products.length > 0 
            ? products.reduce((sum, product) => sum + product.ratings.average, 0) / products.length 
            : 0;

        // Generate AI insights
        const insights = {
            performanceScore: Math.min(100, (totalViews * 0.1) + (totalSales * 2) + (averageRating * 10)),
            keyMetrics: {
                totalProducts,
                totalViews,
                totalSales,
                averageRating: parseFloat(averageRating.toFixed(2)),
                totalRevenue: artisan.totalRevenue
            },
            recommendations: [],
            demandForecast: generateDemandForecast(products),
            pricingOptimization: generatePricingOptimization(products)
        };

        // Generate personalized recommendations
        if (totalProducts < 5) {
            insights.recommendations.push("Add more products to increase visibility");
        }
        if (averageRating < 4.0) {
            insights.recommendations.push("Focus on improving product quality and customer satisfaction");
        }
        if (totalViews / totalProducts < 50) {
            insights.recommendations.push("Optimize product photos and descriptions for better visibility");
        }

        // Update artisan AI insights
        await Artisan.findOneAndUpdate(
            { artisanId },
            { aiInsights: insights }
        );

        res.json({
            message: "Business insights generated successfully",
            insights: insights
        });

    } catch (err) {
        console.error("Business insights error:", err);
        res.status(500).json({
            message: "Failed to generate business insights",
            error: err.message
        });
    }
}

// Generate demand forecast
function generateDemandForecast(products) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    return products.slice(0, 5).map(product => ({
        product: product.name,
        prediction: Math.floor(Math.random() * 50) + 10,
        month: months[Math.floor(Math.random() * 12)]
    }));
}

// Generate pricing optimization
function generatePricingOptimization(products) {
    return products.slice(0, 3).map(product => {
        const currentPrice = product.price;
        const suggestedPrice = currentPrice * (0.9 + Math.random() * 0.2); // ±10% variation
        
        return {
            product: product.name,
            suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
            currentPrice: currentPrice,
            reasoning: suggestedPrice > currentPrice 
                ? "High demand detected, price increase recommended"
                : "Competitive pricing adjustment suggested"
        };
    });
}

// Block/Unblock Artisan (Admin only)
export async function toggleArtisanBlock(req, res) {
    try {
        if (!isItAdmin(req)) {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        const { artisanId } = req.params;
        
        const artisan = await Artisan.findOne({ artisanId });
        if (!artisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        const newBlockedStatus = !artisan.isBlocked;
        
        await Artisan.findOneAndUpdate(
            { artisanId },
            { isBlocked: newBlockedStatus }
        );

        res.json({
            message: `Artisan ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully`,
            isBlocked: newBlockedStatus
        });

    } catch (err) {
        console.error("Toggle block error:", err);
        res.status(500).json({
            message: "Failed to update artisan status",
            error: err.message
        });
    }
}

// controllers/productController.js
export async function createProduct(req, res) {
    try {
        if (!isItArtisan(req)) {
            return res.status(403).json({
                message: "Access denied. Artisan only."
            });
        }

        const productData = req.body;
        productData.artisanId = req.user.artisanId;
        
        // Generate unique product ID
        const lastProduct = await Product.find().sort({ productId: -1 }).limit(1);
        if (lastProduct.length === 0) {
            productData.productId = "PRD0001";
        } else {
            const lastId = lastProduct[0].productId.replace("PRD", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            productData.productId = "PRD" + newId;
        }

        // Initialize AI data
        productData.aiData = {
            qualityScore: 0,
            photoQualityFeedback: [],
            demandPrediction: {
                score: Math.floor(Math.random() * 50) + 50,
                trend: "Growing",
                bestSeasonality: ["December", "January", "February"]
            },
            pricingRecommendations: {
                suggestedPrice: productData.price,
                marketRange: {
                    min: productData.price * 0.8,
                    max: productData.price * 1.3
                }
            }
        };

        const newProduct = new Product(productData);
        await newProduct.save();

        res.status(201).json({
            message: "Product created successfully",
            product: newProduct
        });

    } catch (err) {
        console.error("Create product error:", err);
        res.status(500).json({
            message: "Failed to create product",
            error: err.message
        });
    }
}

// Get Products with AI Recommendations
export async function getProducts(req, res) {
    try {
        const { 
            category, 
            minPrice, 
            maxPrice, 
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
            artisanId,
            culturalInterests 
        } = req.query;

        let query = { availability: true };
        
        // Apply filters
        if (category) query.category = category;
        if (artisanId) query.artisanId = artisanId;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('artisanId', 'firstName lastName businessName profileImage');

        // If user has cultural interests, apply AI recommendations
        if (culturalInterests && req.user) {
            products = await applyAIRecommendations(products, culturalInterests.split(','));
        }

        const total = await Product.countDocuments(query);

        res.json({
            message: "Products fetched successfully",
            products: products,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: products.length,
                totalProducts: total
            }
        });

    } catch (err) {
        console.error("Get products error:", err);
        res.status(500).json({
            message: "Failed to fetch products",
            error: err.message
        });
    }
}

// AI Recommendation Engine
async function applyAIRecommendations(products, culturalInterests) {
    return products.map(product => {
        // Calculate recommendation score based on cultural interests
        let recommendationScore = 0;
        
        culturalInterests.forEach(interest => {
            if (product.culturalStory.toLowerCase().includes(interest.toLowerCase()) ||
                product.description.toLowerCase().includes(interest.toLowerCase())) {
                recommendationScore += 20;
            }
            if (product.category.toLowerCase().includes(interest.toLowerCase())) {
                recommendationScore += 15;
            }
            if (product.tags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))) {
                recommendationScore += 10;
            }
        });

        // Add rating and sales factors
        recommendationScore += product.ratings.average * 5;
        recommendationScore += Math.min(product.totalSales * 2, 20);

        return {
            ...product.toObject(),
            aiRecommendationScore: Math.min(recommendationScore, 100)
        };
    }).sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore);
}

// Update Product
export async function updateProduct(req, res) {
    try {
        const { productId } = req.params;
        const updateData = req.body;
        
        // Check if user is the product owner or admin
        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (!isItAdmin(req) && product.artisanId !== req.user.artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Don't allow changing productId or artisanId
        delete updateData.productId;
        delete updateData.artisanId;

        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (err) {
        console.error("Update product error:", err);
        res.status(500).json({
            message: "Failed to update product",
            error: err.message
        });
    }
}

// Delete Product
export async function deleteProduct(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Check if user is the product owner or admin
        if (!isItAdmin(req) && product.artisanId !== req.user.artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        await Product.findOneAndDelete({ productId });

        res.json({
            message: "Product deleted successfully"
        });

    } catch (err) {
        console.error("Delete product error:", err);
        res.status(500).json({
            message: "Failed to delete product",
            error: err.message
        });
    }
}

// Get Single Product with Cultural Story Enhancement
export async function getProduct(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await Product.findOne({ productId })
            .populate('artisanId', 'firstName lastName businessName profileImage bio culturalBackground traditionalTechniques');

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Increment view count
        await Product.findOneAndUpdate(
            { productId },
            { $inc: { views: 1 } }
        );

        // Generate AI-powered cultural story enhancement
        const enhancedStory = await generateCulturalStoryEnhancement(product);

        res.json({
            message: "Product fetched successfully",
            product: {
                ...product.toObject(),
                enhancedCulturalStory: enhancedStory
            }
        });

    } catch (err) {
        console.error("Get product error:", err);
        res.status(500).json({
            message: "Failed to fetch product",
            error: err.message
        });
    }
}

// AI Cultural Story Enhancement
async function generateCulturalStoryEnhancement(product) {
    // In production, integrate with GPT or similar AI service
    const enhancements = [
        `This ${product.category.toLowerCase()} represents centuries of ${product.artisanId.culturalBackground} craftsmanship tradition.`,
        `The techniques used in creating this piece have been passed down through generations of skilled artisans.`,
        `Each detail reflects the rich cultural heritage of Sri Lanka and tells a story of artistic evolution.`,
        `The materials and colors used hold special significance in traditional ${product.artisanId.culturalBackground} culture.`
    ];

    const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
    
    return {
        originalStory: product.culturalStory,
        aiEnhancement: randomEnhancement,
        culturalContext: `This craft originates from the ${product.artisanId.culturalBackground} tradition, where ${product.category.toLowerCase()} making is considered both an art and a spiritual practice.`,
        artisanInsight: `Crafted by ${product.artisanId.firstName} ${product.artisanId.lastName} of ${product.artisanId.businessName}, who has been practicing these traditional techniques for years.`
    };
}