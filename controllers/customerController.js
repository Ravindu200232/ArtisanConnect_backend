// controllers/customerController.js
import { Customer } from "../models/customer.js";
import { Product } from "../models/product.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function isItCustomer(req) {
    return req.user != null && req.user.role === "customer";
}

// Customer Registration
export async function registerCustomer(req, res) {
    try {
        const data = req.body;
        
        const existingCustomer = await Customer.findOne({ email: data.email });
        if (existingCustomer) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        data.password = await bcrypt.hash(data.password, 10);
        
        // Generate unique customer ID
        const lastCustomer = await Customer.find().sort({ customerId: -1 }).limit(1);
        if (lastCustomer.length === 0) {
            data.customerId = "CUST0001";
        } else {
            const lastId = lastCustomer[0].customerId.replace("CUST", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            data.customerId = "CUST" + newId;
        }

        // Initialize AI profile
        data.aiProfile = {
            culturalPersonality: [
                { trait: "Traditional", score: 50 },
                { trait: "Modern", score: 50 },
                { trait: "Artistic", score: 60 },
                { trait: "Cultural", score: 70 }
            ],
            purchasePatterns: [],
            recommendations: [],
            searchHistory: [],
            viewHistory: []
        };

        const newCustomer = new Customer(data);
        await newCustomer.save();

        res.status(201).json({
            message: "Customer registered successfully",
            customerId: data.customerId
        });

    } catch (err) {
        console.error("Customer registration error:", err);
        res.status(500).json({
            message: "Customer registration failed",
            error: err.message
        });
    }
}

// Customer Login
export async function loginCustomer(req, res) {
    try {
        const { email, password } = req.body;

        const customer = await Customer.findOne({ email });
        
        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        if (customer.isBlocked) {
            return res.status(403).json({
                message: "Account is blocked. Please contact support."
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, customer.password);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                customerId: customer.customerId,
                email: customer.email,
                role: "customer",
                firstName: customer.firstName,
                lastName: customer.lastName,
                preferences: customer.preferences
            },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login successful",
            token: token,
            customer: {
                customerId: customer.customerId,
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                profileImage: customer.profileImage,
                preferences: customer.preferences
            }
        });

    } catch (err) {
        console.error("Customer login error:", err);
        res.status(500).json({
            message: "Login failed",
            error: err.message
        });
    }
}

// Get AI-Powered Product Recommendations
export async function getPersonalizedRecommendations(req, res) {
    try {
        if (!isItCustomer(req)) {
            return res.status(403).json({
                message: "Access denied. Customer only."
            });
        }

        const customerId = req.user.customerId;
        const customer = await Customer.findOne({ customerId });
        
        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        // Get products based on customer preferences and AI profile
        let query = { availability: true };
        
        // Apply category preferences
        if (customer.preferences.categories && customer.preferences.categories.length > 0) {
            query.category = { $in: customer.preferences.categories };
        }

        // Apply price range preferences
        if (customer.preferences.priceRange) {
            query.price = {};
            if (customer.preferences.priceRange.min) {
                query.price.$gte = customer.preferences.priceRange.min;
            }
            if (customer.preferences.priceRange.max) {
                query.price.$lte = customer.preferences.priceRange.max;
            }
        }

        let products = await Product.find(query).limit(20);
        
        // Apply AI scoring
        const recommendedProducts = products.map(product => {
            let aiScore = 0;
            
            // Cultural interest matching
            if (customer.preferences.culturalInterests) {
                customer.preferences.culturalInterests.forEach(interest => {
                    if (product.culturalStory.toLowerCase().includes(interest.toLowerCase())) {
                        aiScore += 25;
                    }
                    if (product.tags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))) {
                        aiScore += 15;
                    }
                });
            }

            // Purchase pattern matching
            customer.aiProfile.purchasePatterns.forEach(pattern => {
                if (pattern.category === product.category) {
                    aiScore += 20;
                }
            });

            // View history matching
            const hasViewed = customer.aiProfile.viewHistory.some(
                view => view.productId === product.productId
            );
            if (hasViewed) {
                aiScore += 10;
            }

            // Rating and popularity boost
            aiScore += product.ratings.average * 5;
            aiScore += Math.min(product.totalSales, 10);

            return {
                ...product.toObject(),
                aiRecommendationScore: Math.min(aiScore, 100),
                recommendationReasons: generateRecommendationReasons(product, customer)
            };
        });

        // Sort by AI score
        recommendedProducts.sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore);

        // Update customer AI recommendations
        const recommendations = recommendedProducts.slice(0, 10).map(product => ({
            productId: product.productId,
            score: product.aiRecommendationScore,
            reasoning: product.recommendationReasons.join(', '),
            date: new Date()
        }));

        await Customer.findOneAndUpdate(
            { customerId },
            { $push: { "aiProfile.recommendations": { $each: recommendations, $slice: -50 } } }
        );

        res.json({
            message: "Personalized recommendations generated",
            recommendations: recommendedProducts.slice(0, 10)
        });

    } catch (err) {
        console.error("Recommendations error:", err);
        res.status(500).json({
            message: "Failed to generate recommendations",
            error: err.message
        });
    }
}

function generateRecommendationReasons(product, customer) {
    const reasons = [];
    
    if (customer.preferences.categories && customer.preferences.categories.includes(product.category)) {
        reasons.push(`Matches your interest in ${product.category}`);
    }
    
    if (customer.preferences.culturalInterests) {
        customer.preferences.culturalInterests.forEach(interest => {
            if (product.culturalStory.toLowerCase().includes(interest.toLowerCase())) {
                reasons.push(`Features ${interest} cultural elements`);
            }
        });
    }
    
    if (product.ratings.average > 4.0) {
        reasons.push("Highly rated by other customers");
    }
    
    if (product.totalSales > 10) {
        reasons.push("Popular choice among buyers");
    }
    
    return reasons.length > 0 ? reasons : ["Curated for you based on your profile"];
}

// Update Customer Preferences and AI Profile
export async function updateCustomerPreferences(req, res) {
    try {
        if (!isItCustomer(req)) {
            return res.status(403).json({
                message: "Access denied. Customer only."
            });
        }

        const customerId = req.user.customerId;
        const { preferences, culturalPersonality } = req.body;

        const updateData = {};
        if (preferences) updateData.preferences = preferences;
        if (culturalPersonality) updateData["aiProfile.culturalPersonality"] = culturalPersonality;

        const updatedCustomer = await Customer.findOneAndUpdate(
            { customerId },
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.json({
            message: "Preferences updated successfully",
            customer: updatedCustomer
        });

    } catch (err) {
        console.error("Update preferences error:", err);
        res.status(500).json({
            message: "Failed to update preferences",
            error: err.message
        });
    }
}

// Track Product View for AI Learning
export async function trackProductView(req, res) {
    try {
        if (!isItCustomer(req)) {
            return res.status(403).json({
                message: "Access denied. Customer only."
            });
        }

        const { productId, duration } = req.body;
        const customerId = req.user.customerId;

        await Customer.findOneAndUpdate(
            { customerId },
            {
                $push: {
                    "aiProfile.viewHistory": {
                        $each: [{
                            productId: productId,
                            duration: duration || 0,
                            date: new Date()
                        }],
                        $slice: -100 // Keep only last 100 views
                    }
                }
            }
        );

        res.json({
            message: "Product view tracked successfully"
        });

    } catch (err) {
        console.error("Track view error:", err);
        res.status(500).json({
            message: "Failed to track product view",
            error: err.message
        });
    }
}

// controllers/aiController.js - AI Service Controller
export async function generateCulturalStory(req, res) {
    try {
        const { productName, category, materials, culturalBackground } = req.body;
        
        // AI Cultural Storytelling Engine simulation
        const culturalStories = {
            'Woodcarving': [
                `This exquisite ${productName} represents the ancient art of Sri Lankan woodcarving, where each chisel mark tells a story of devotion and skill passed down through generations of master craftsmen.`,
                `Crafted using traditional techniques dating back to the Kandyan era, this ${productName} embodies the spiritual connection between the artisan and the sacred wood from which it emerges.`
            ],
            'Pottery': [
                `This beautiful ${productName} carries the essence of Sri Lankan clay traditions, where earth and fire unite under the skilled hands of artisans who learned their craft from village elders.`,
                `Each curve and contour of this ${productName} reflects centuries of pottery wisdom, shaped by techniques that connect us to our ancestors and the earth itself.`
            ],
            'Textile': [
                `This stunning ${productName} weaves together threads of history and culture, representing the rich textile traditions that have adorned Sri Lankan royalty and common folk alike.`,
                `Every fiber in this ${productName} tells a story of heritage, where traditional looms and ancestral patterns create modern beauty with timeless soul.`
            ],
            'Batik': [
                `This vibrant ${productName} captures the essence of Sri Lankan batik artistry, where hot wax and natural dyes dance together to create patterns that speak of tropical paradise and cultural identity.`,
                `Each motif on this ${productName} is a testament to the batik masters who transformed simple cloth into canvases of cultural expression and artistic excellence.`
            ]
        };

        const stories = culturalStories[category] || [
            `This remarkable ${productName} represents the diverse artisanal traditions of Sri Lanka, crafted with materials that connect us to our island's natural beauty and cultural heritage.`
        ];

        const generatedStory = stories[Math.floor(Math.random() * stories.length)];
        
        const enhancedStory = {
            mainStory: generatedStory,
            culturalContext: `Rooted in ${culturalBackground} traditions, this craft form has been preserved and evolved by generations of skilled artisans.`,
            materialsSignificance: `The ${materials.join(' and ')} used in this piece hold special cultural significance, chosen not just for their beauty but for their connection to Sri Lankan heritage.`,
            artisanConnection: "Created by skilled hands that carry forward the wisdom of master craftspeople, ensuring that each piece is unique and authentic.",
            modernRelevance: "While honoring traditional techniques, this piece bridges ancient wisdom with contemporary aesthetics, making cultural heritage accessible to modern lifestyles."
        };

        res.json({
            message: "Cultural story generated successfully",
            story: enhancedStory
        });

    } catch (err) {
        console.error("Cultural story generation error:", err);
        res.status(500).json({
            message: "Failed to generate cultural story",
            error: err.message
        });
    }
}

// Real-time Translation Service
export async function translateContent(req, res) {
    try {
        const { text, sourceLang, targetLang, contentType } = req.body;
        
        // Simulate translation service (integrate with Google Translate API in production)
        const translations = {
            'en_to_si': {
                'Hello': 'ආයුබෝවන්',
                'Thank you': 'ස්තුතියි',
                'Beautiful craft': 'ලස්සන කලාව',
                'Traditional art': 'සම්ප්‍රදායික කලාව',
                'Handmade': 'අතින් සාදන ලද',
                'Cultural heritage': 'සංස්කෘතික උරුමය'
            },
            'en_to_ta': {
                'Hello': 'வணக்கம்',
                'Thank you': 'நன்றி',
                'Beautiful craft': 'அழகான கைவினை',
                'Traditional art': 'பாரம்பரிய கலை',
                'Handmade': 'கையால் செய்யப்பட்ட',
                'Cultural heritage': 'கலாச்சார பாரம்பரியம்'
            }
        };

        const translationKey = `${sourceLang}_to_${targetLang}`;
        let translatedText = text;

        if (translations[translationKey] && translations[translationKey][text]) {
            translatedText = translations[translationKey][text];
        } else {
            // For demo purposes, add a prefix to show translation attempt
            translatedText = `[${targetLang.toUpperCase()}] ${text}`;
        }

        // Add cultural etiquette guidance
        const culturalGuidance = {
            'si': 'In Sinhala culture, showing respect through language is important. Use "ආයුබෝවන්" for formal greetings.',
            'ta': 'Tamil cultural communication values politeness. "வணக்கம்" is appropriate for all occasions.',
            'en': 'English communication in Sri Lankan context often incorporates local expressions for warmth.'
        };

        res.json({
            message: "Translation completed",
            translation: {
                original: text,
                translated: translatedText,
                sourceLang: sourceLang,
                targetLang: targetLang,
                confidence: 0.95,
                culturalGuidance: culturalGuidance[targetLang] || "Cultural context preserved in translation."
            }
        });

    } catch (err) {
        console.error("Translation error:", err);
        res.status(500).json({
            message: "Translation failed",
            error: err.message
        });
    }
}

// AR Product Visualization
export async function generateARVisualization(req, res) {
    try {
        const { productId, roomType, dimensions } = req.body;
        
        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Generate AR visualization data
        const arVisualization = {
            productId: productId,
            arModelUrl: `https://ar-models.artisanconnect.com/${productId}.glb`,
            previewImages: [
                `https://ar-previews.artisanconnect.com/${productId}_living_room.jpg`,
                `https://ar-previews.artisanconnect.com/${productId}_bedroom.jpg`,
                `https://ar-previews.artisanconnect.com/${productId}_office.jpg`
            ],
            roomPlacements: {
                livingRoom: {
                    suggestedPositions: [
                        { x: 0, y: 0, z: -2, rotation: { x: 0, y: 45, z: 0 } },
                        { x: 1.5, y: 0.8, z: -1, rotation: { x: 0, y: -30, z: 0 } }
                    ]
                },
                bedroom: {
                    suggestedPositions: [
                        { x: -1, y: 0.5, z: -1.5, rotation: { x: 0, y: 90, z: 0 } }
                    ]
                },
                office: {
                    suggestedPositions: [
                        { x: 0, y: 1, z: -1, rotation: { x: 0, y: 0, z: 0 } }
                    ]
                }
            },
            scaleOptions: [0.5, 0.75, 1.0, 1.25, 1.5],
            lightingConditions: ['natural', 'warm', 'bright', 'ambient'],
            compatibilityInfo: {
                requiresARCore: true,
                minAndroidVersion: '7.0',
                minIOSVersion: '11.0',
                estimatedFileSize: '2.5MB'
            }
        };

        res.json({
            message: "AR visualization data generated",
            arData: arVisualization
        });

    } catch (err) {
        console.error("AR generation error:", err);
        res.status(500).json({
            message: "Failed to generate AR visualization",
            error: err.message
        });
    }
}

// IoT Sensor Data Processing
export async function processIoTData(req, res) {
    try {
        const { sensorId, sensorType, data, timestamp } = req.body;
        
        // Process different types of IoT sensor data
        let processedData = {};
        
        switch (sensorType) {
            case 'workshop_environment':
                processedData = {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    lightLevel: data.lightLevel,
                    airQuality: data.airQuality,
                    recommendations: generateEnvironmentRecommendations(data),
                    status: getEnvironmentStatus(data)
                };
                break;
                
            case 'material_inventory':
                processedData = {
                    materialType: data.materialType,
                    quantity: data.quantity,
                    quality: data.quality,
                    lastUpdated: timestamp,
                    alerts: generateInventoryAlerts(data),
                    reorderSuggestion: data.quantity < data.minimumLevel
                };
                break;
                
            case 'production_tracking':
                processedData = {
                    productionTime: data.productionTime,
                    toolUsage: data.toolUsage,
                    efficiency: calculateEfficiency(data),
                    qualityMetrics: data.qualityMetrics,
                    insights: generateProductionInsights(data)
                };
                break;
                
            default:
                processedData = data;
        }

        // Store processed data (in production, save to time-series database)
        res.json({
            message: "IoT data processed successfully",
            sensorId: sensorId,
            processedData: processedData,
            timestamp: timestamp
        });

    } catch (err) {
        console.error("IoT processing error:", err);
        res.status(500).json({
            message: "Failed to process IoT data",
            error: err.message
        });
    }
}

function generateEnvironmentRecommendations(data) {
    const recommendations = [];
    
    if (data.temperature < 18) {
        recommendations.push("Consider increasing workshop temperature for optimal working conditions");
    } else if (data.temperature > 28) {
        recommendations.push("Workshop temperature is high, ensure proper ventilation");
    }
    
    if (data.humidity < 30) {
        recommendations.push("Low humidity detected, may affect certain materials like wood");
    } else if (data.humidity > 70) {
        recommendations.push("High humidity levels may impact drying times and material quality");
    }
    
    if (data.lightLevel < 300) {
        recommendations.push("Insufficient lighting for detailed craft work, consider additional lighting");
    }
    
    return recommendations;
}

function getEnvironmentStatus(data) {
    let score = 100;
    
    if (data.temperature < 18 || data.temperature > 28) score -= 20;
    if (data.humidity < 30 || data.humidity > 70) score -= 15;
    if (data.lightLevel < 300) score -= 25;
    if (data.airQuality && data.airQuality < 70) score -= 20;
    
    if (score >= 80) return "Optimal";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
}

function generateInventoryAlerts(data) {
    const alerts = [];
    
    if (data.quantity <= data.minimumLevel) {
        alerts.push({
            type: "LOW_STOCK",
            message: `${data.materialType} stock is running low`,
            severity: "HIGH"
        });
    }
    
    if (data.quality && data.quality < 70) {
        alerts.push({
            type: "QUALITY_ISSUE",
            message: `Quality degradation detected in ${data.materialType}`,
            severity: "MEDIUM"
        });
    }
    
    return alerts;
}

function calculateEfficiency(data) {
    const baseTime = data.expectedTime || 100;
    const actualTime = data.productionTime;
    
    return Math.max(0, Math.round((baseTime / actualTime) * 100));
}

function generateProductionInsights(data) {
    const insights = [];
    
    const efficiency = calculateEfficiency(data);
    
    if (efficiency > 120) {
        insights.push("Excellent production efficiency! Consider sharing these techniques.");
    } else if (efficiency < 80) {
        insights.push("Production efficiency could be improved. Review workflow and tool maintenance.");
    }
    
    if (data.toolUsage && data.toolUsage.wearLevel > 80) {
        insights.push("Tools showing significant wear, consider maintenance or replacement.");
    }
    
    return insights;
}