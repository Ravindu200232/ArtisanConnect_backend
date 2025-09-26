// controllers/tourismController.js
import { TourismPackage } from "../models/tourismPackage.js";

export function isItTourismProvider(req) {
    return req.user != null && req.user.role === "tourism_provider";
}

// Create Tourism Package
export async function createTourismPackage(req, res) {
    try {
        if (!isItTourismProvider(req) && req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const packageData = req.body;
        packageData.providerId = req.user.userId || req.user.providerId;
        
        const lastPackage = await TourismPackage.find().sort({ packageId: -1 }).limit(1);
        if (lastPackage.length === 0) {
            packageData.packageId = "PKG0001";
        } else {
            const lastId = lastPackage[0].packageId.replace("PKG", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            packageData.packageId = "PKG" + newId;
        }

        // Initialize AI personalization
        packageData.aiPersonalization = {
            recommendedFor: generatePersonalityRecommendations(packageData),
            culturalInsights: generateCulturalInsights(packageData),
            learningObjectives: generateLearningObjectives(packageData)
        };

        const newPackage = new TourismPackage(packageData);
        await newPackage.save();

        res.status(201).json({
            message: "Tourism package created successfully",
            package: newPackage
        });

    } catch (err) {
        console.error("Create package error:", err);
        res.status(500).json({
            message: "Failed to create package",
            error: err.message
        });
    }
}

// Get All Tourism Packages
export async function getAllTourismPackages(req, res) {
    try {
        const { 
            type, 
            location, 
            maxPrice, 
            duration,
            page = 1, 
            limit = 20 
        } = req.query;

        let query = { isActive: true };
        
        if (type) query.type = type;
        if (location) query['location.province'] = location;
        if (maxPrice) query['price.adult'] = { $lte: parseFloat(maxPrice) };
        if (duration) query['duration.days'] = { $lte: parseInt(duration) };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const packages = await TourismPackage.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ featured: -1, ratings: -1 });

        const total = await TourismPackage.countDocuments(query);

        res.json({
            message: "Tourism packages fetched successfully",
            packages: packages,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: packages.length
            }
        });

    } catch (err) {
        console.error("Get packages error:", err);
        res.status(500).json({
            message: "Failed to fetch packages",
            error: err.message
        });
    }
}

// Get Tourism Package
export async function getTourismPackage(req, res) {
    try {
        const { packageId } = req.params;
        
        const tourPackage = await TourismPackage.findOne({ packageId });
        
        if (!tourPackage) {
            return res.status(404).json({
                message: "Package not found"
            });
        }

        res.json({
            message: "Package fetched successfully",
            package: tourPackage
        });

    } catch (err) {
        console.error("Get package error:", err);
        res.status(500).json({
            message: "Failed to fetch package",
            error: err.message
        });
    }
}

// Update Tourism Package
export async function updateTourismPackage(req, res) {
    try {
        const { packageId } = req.params;
        const updateData = req.body;

        const tourPackage = await TourismPackage.findOne({ packageId });
        if (!tourPackage) {
            return res.status(404).json({
                message: "Package not found"
            });
        }

        if (!isItTourismProvider(req) && req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (isItTourismProvider(req) && tourPackage.providerId !== req.user.providerId) {
            return res.status(403).json({
                message: "Access denied - not your package"
            });
        }

        delete updateData.packageId;
        delete updateData.providerId;

        const updatedPackage = await TourismPackage.findOneAndUpdate(
            { packageId },
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            message: "Tourism package updated successfully",
            package: updatedPackage
        });

    } catch (err) {
        console.error("Update package error:", err);
        res.status(500).json({
            message: "Failed to update package",
            error: err.message
        });
    }
}

// Delete Tourism Package
export async function deleteTourismPackage(req, res) {
    try {
        const { packageId } = req.params;

        const tourPackage = await TourismPackage.findOne({ packageId });
        if (!tourPackage) {
            return res.status(404).json({
                message: "Package not found"
            });
        }

        if (!isItTourismProvider(req) && req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (isItTourismProvider(req) && tourPackage.providerId !== req.user.providerId) {
            return res.status(403).json({
                message: "Access denied - not your package"
            });
        }

        await TourismPackage.findOneAndDelete({ packageId });

        res.json({
            message: "Tourism package deleted successfully"
        });

    } catch (err) {
        console.error("Delete package error:", err);
        res.status(500).json({
            message: "Failed to delete package",
            error: err.message
        });
    }
}

// Book Tourism Package
export async function bookTourismPackage(req, res) {
    try {
        const { packageId, bookingDate, participants, specialRequests } = req.body;

        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const tourPackage = await TourismPackage.findOne({ packageId, isActive: true });
        if (!tourPackage) {
            return res.status(404).json({
                message: "Package not found or inactive"
            });
        }

        if (participants > tourPackage.maxParticipants) {
            return res.status(400).json({
                message: `Maximum ${tourPackage.maxParticipants} participants allowed`
            });
        }

        const bookingId = `BOOK_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const booking = {
            bookingId: bookingId,
            packageId: packageId,
            customerId: req.user.customerId,
            customerName: `${req.user.firstName} ${req.user.lastName}`,
            bookingDate: new Date(bookingDate),
            participants: participants,
            totalAmount: tourPackage.price.adult * participants,
            status: "confirmed",
            specialRequests: specialRequests || [],
            createdAt: new Date()
        };

        await TourismPackage.findOneAndUpdate(
            { packageId },
            { $inc: { totalBookings: 1 } }
        );

        res.status(201).json({
            message: "Tourism package booked successfully",
            booking: booking,
            package: {
                title: tourPackage.title,
                location: tourPackage.location,
                duration: tourPackage.duration
            }
        });

    } catch (err) {
        console.error("Book package error:", err);
        res.status(500).json({
            message: "Failed to book package",
            error: err.message
        });
    }
}

// Get Bookings
export async function getBookings(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const mockBookings = [
            {
                bookingId: "BOOK_001",
                packageId: "PKG0001",
                customerName: `${req.user.firstName} ${req.user.lastName}`,
                bookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                participants: 2,
                totalAmount: 11000,
                status: "confirmed",
                createdAt: new Date()
            }
        ];

        let filteredBookings = mockBookings;
        if (req.user.role === "customer") {
            filteredBookings = mockBookings.filter(b => b.customerId === req.user.customerId);
        } else if (isItTourismProvider(req)) {
            filteredBookings = mockBookings.filter(b => b.providerId === req.user.providerId);
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.json({
            message: "Bookings fetched successfully",
            bookings: filteredBookings
        });

    } catch (err) {
        console.error("Get bookings error:", err);
        res.status(500).json({
            message: "Failed to fetch bookings",
            error: err.message
        });
    }
}

// Generate VR Content
export async function generateVRContent(req, res) {
    try {
        const { packageId, contentType } = req.body;
        
        const vrContent = {
            packageId: packageId,
            vrExperienceUrl: `https://vr.artisanconnect.com/experiences/${packageId}`,
            content360Video: `https://vr.artisanconnect.com/360/${packageId}.mp4`,
            interactiveElements: [
                {
                    type: "hotspot",
                    position: { x: 0.5, y: 0.3, z: -2 },
                    content: "Traditional pottery demonstration",
                    mediaUrl: `https://vr.artisanconnect.com/media/${packageId}_pottery.jpg`
                },
                {
                    type: "audio",
                    position: { x: -1, y: 0, z: -1 },
                    content: "Cultural story narration",
                    audioUrl: `https://vr.artisanconnect.com/audio/${packageId}_story.mp3`
                }
            ],
            navigationPoints: [
                { name: "Workshop Entrance", position: { x: 0, y: 0, z: 0 } },
                { name: "Craft Area", position: { x: 3, y: 0, z: -2 } },
                { name: "Display Area", position: { x: -2, y: 0, z: -3 } }
            ],
            compatibilityInfo: {
                platforms: ["Oculus", "HTC Vive", "WebVR"],
                minimumSpecs: "Medium",
                fileSize: "15MB"
            }
        };

        res.json({
            message: "VR content generated successfully",
            vrContent: vrContent
        });

    } catch (err) {
        console.error("VR content error:", err);
        res.status(500).json({
            message: "Failed to generate VR content",
            error: err.message
        });
    }
}

// GPS Culture Discovery
export async function getGPSCulturePoints(req, res) {
    try {
        const { latitude, longitude } = req.params;
        const radius = req.query.radius || 5;

        const culturePoints = [
            {
                id: "CP001",
                name: "Traditional Mask Carving Workshop",
                type: "Workshop",
                distance: Math.random() * parseFloat(radius),
                coordinates: { 
                    latitude: parseFloat(latitude) + (Math.random() - 0.5) * 0.01,
                    longitude: parseFloat(longitude) + (Math.random() - 0.5) * 0.01
                },
                description: "Experience the ancient art of Kolam mask carving",
                artisanInfo: {
                    name: "Master Seneviratne",
                    experience: "30 years",
                    specialties: ["Devil Masks", "Traditional Kolam"]
                },
                visitInfo: {
                    openHours: "9:00 AM - 5:00 PM",
                    visitDuration: "2 hours",
                    cost: "LKR 2500",
                    bookingRequired: true
                },
                culturalSignificance: "Mask carving has been practiced in this region for over 500 years",
                arContent: {
                    hasAR: true,
                    markerUrl: "https://ar.artisanconnect.com/markers/CP001.jpg",
                    modelUrl: "https://ar.artisanconnect.com/models/mask_workshop.glb"
                }
            },
            {
                id: "CP002",
                name: "Pottery Village",
                type: "Cultural Site",
                distance: Math.random() * parseFloat(radius),
                coordinates: { 
                    latitude: parseFloat(latitude) + (Math.random() - 0.5) * 0.01,
                    longitude: parseFloat(longitude) + (Math.random() - 0.5) * 0.01
                },
                description: "Visit a traditional pottery making community",
                artisanInfo: {
                    name: "Pottery Collective",
                    members: 12,
                    specialties: ["Water Pots", "Decorative Ceramics"]
                },
                visitInfo: {
                    openHours: "8:00 AM - 6:00 PM",
                    visitDuration: "3 hours",
                    cost: "LKR 1800",
                    bookingRequired: false
                },
                culturalSignificance: "This village has produced pottery for royal courts since the Kandyan period"
            }
        ];

        res.json({
            message: "Cultural points discovered",
            location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            radius: parseFloat(radius),
            culturePoints: culturePoints.filter(point => point.distance <= parseFloat(radius))
        });

    } catch (err) {
        console.error("GPS culture discovery error:", err);
        res.status(500).json({
            message: "Failed to discover culture points",
            error: err.message
        });
    }
}

// AI Experience Personalization
export async function personalizeExperience(req, res) {
    try {
        const { interests, travelStyle, duration, budget, groupSize } = req.body;
        
        const personalizedItinerary = {
            recommendedPackages: [],
            customItinerary: generateCustomItinerary(interests, duration),
            culturalInsights: generatePersonalizedInsights(interests),
            languageRecommendations: getLanguageRecommendations(interests),
            souvenirSuggestions: getSouvenirSuggestions(interests, budget),
            experienceLevel: determineExperienceLevel(travelStyle, interests)
        };

        const packages = await TourismPackage.find({ isActive: true });
        const scoredPackages = packages.map(pkg => ({
            ...pkg.toObject(),
            personalizedScore: calculatePersonalizationScore(pkg, { interests, travelStyle, budget, groupSize })
        }));

        personalizedItinerary.recommendedPackages = scoredPackages
            .sort((a, b) => b.personalizedScore - a.personalizedScore)
            .slice(0, 5);

        res.json({
            message: "Experience personalized successfully",
            personalization: personalizedItinerary
        });

    } catch (err) {
        console.error("Personalization error:", err);
        res.status(500).json({
            message: "Failed to personalize experience",
            error: err.message
        });
    }
}

// Helper functions
function generatePersonalityRecommendations(packageData) {
    const recommendations = [];
    
    if (packageData.type === "Workshop") {
        recommendations.push({ trait: "Creative", score: 90 });
        recommendations.push({ trait: "Hands-on Learner", score: 85 });
    }
    
    if (packageData.type === "Cultural Tour") {
        recommendations.push({ trait: "History Enthusiast", score: 80 });
        recommendations.push({ trait: "Cultural Explorer", score: 85 });
    }
    
    return recommendations;
}

function generateCulturalInsights(packageData) {
    return [
        `This experience showcases ${packageData.culturalExperience} traditions`,
        `Learn about the historical significance of ${packageData.type.toLowerCase()} in Sri Lankan culture`,
        "Understand the connection between craft and community in traditional Sri Lankan society"
    ];
}

function generateLearningObjectives(packageData) {
    return [
        `Master basic techniques in ${packageData.craftsTaught ? packageData.craftsTaught.join(', ') : 'traditional crafts'}`,
        "Understand cultural contexts and historical significance",
        "Appreciate the role of craftsmanship in Sri Lankan heritage",
        "Develop cross-cultural understanding and appreciation"
    ];
}

function generateCustomItinerary(interests, duration) {
    const activities = {
        'traditional_crafts': ['Workshop visit', 'Master class', 'Cultural demonstration'],
        'history': ['Heritage site tour', 'Museum visit', 'Archaeological site'],
        'nature': ['Village walk', 'Material sourcing tour', 'Landscape photography'],
        'food': ['Traditional meal preparation', 'Local market visit', 'Tea ceremony']
    };
    
    const itinerary = [];
    const daysCount = parseInt(duration) || 1;
    
    for (let day = 1; day <= daysCount; day++) {
        const dayActivities = interests.map(interest => 
            activities[interest] ? activities[interest][Math.floor(Math.random() * activities[interest].length)] : 'Cultural exploration'
        );
        
        itinerary.push({
            day: day,
            theme: interests[Math.floor(Math.random() * interests.length)],
            activities: dayActivities.slice(0, 3),
            estimatedDuration: "6-8 hours"
        });
    }
    
    return itinerary;
}

function generatePersonalizedInsights(interests) {
    const insights = {
        'traditional_crafts': "Sri Lankan crafts represent over 2000 years of cultural evolution, with each technique carrying stories of royal patronage and village traditions.",
        'history': "The island's strategic position made it a melting pot of cultures, reflected in its diverse artistic traditions.",
        'spirituality': "Buddhist and Hindu influences are deeply woven into craft traditions, with many techniques originating in temple arts.",
        'nature': "Sri Lanka's biodiversity provides unique materials for crafts, from different wood types to natural dyes from indigenous plants."
    };
    
    return interests.map(interest => insights[interest] || "Discover the rich cultural heritage of Sri Lankan craftsmanship.").slice(0, 3);
}

function getLanguageRecommendations(interests) {
    return [
        { phrase: "Ayubowan", translation: "May you live long", usage: "Traditional greeting" },
        { phrase: "Bohoma sthuthi", translation: "Thank you very much", usage: "Expressing gratitude" },
        { phrase: "Lassanai", translation: "Beautiful", usage: "Appreciating crafts" }
    ];
}

function getSouvenirSuggestions(interests, budget) {
    const suggestions = [
        { item: "Handcrafted wooden elephant", priceRange: "LKR 2000-5000", cultural: "Symbol of wisdom and strength" },
        { item: "Traditional mask replica", priceRange: "LKR 1500-3500", cultural: "Represents Sri Lankan folk traditions" },
        { item: "Batik wall hanging", priceRange: "LKR 3000-8000", cultural: "Contemporary expression of ancient art" }
    ];
    
    if (budget === 'luxury') {
        suggestions.push({ item: "Custom commissioned piece", priceRange: "LKR 15000+", cultural: "One-of-a-kind artwork" });
    }
    
    return suggestions;
}

function determineExperienceLevel(travelStyle, interests) {
    if (interests.includes('traditional_crafts') && travelStyle === 'immersive') {
        return "Deep Cultural Immersion";
    } else if (interests.length > 2) {
        return "Cultural Explorer";
    } else {
        return "Cultural Introduction";
    }
}

function calculatePersonalizationScore(pkg, preferences) {
    let score = 0;
    
    preferences.interests.forEach(interest => {
        if (pkg.culturalExperience.toLowerCase().includes(interest)) score += 30;
        if (pkg.craftsTaught && pkg.craftsTaught.some(craft => craft.toLowerCase().includes(interest))) score += 25;
        if (pkg.culturalElements.some(element => element.toLowerCase().includes(interest))) score += 20;
    });
    
    if (preferences.budget === 'luxury' && pkg.price.adult > 5000) score += 15;
    if (preferences.budget === 'moderate' && pkg.price.adult <= 5000 && pkg.price.adult >= 2000) score += 15;
    if (preferences.budget === 'budget' && pkg.price.adult < 2000) score += 15;
    
    if (pkg.maxParticipants >= preferences.groupSize) score += 10;
    
    score += pkg.ratings.average * 5;
    
    return Math.min(score, 100);
}