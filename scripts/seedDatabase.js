// scripts/seedDatabase.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import Artisan from "../models/artisan.js";
import { Customer } from "../models/customer.js";
import { Product } from "../models/product.js";
import { Supplier } from "../models/supplier.js";
import { TourismPackage } from "../models/tourismPackage.js";

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to database for seeding...");

        // Clear existing data
        await Promise.all([
            Artisan.deleteMany({}),
            Customer.deleteMany({}),
            Product.deleteMany({}),
            Supplier.deleteMany({}),
            TourismPackage.deleteMany({})
        ]);

        // Seed Artisans
        const artisans = [
            {
                artisanId: "ART0001",
                email: "master.seneviratne@artisan.lk",
                password: await bcrypt.hash("password123", 10),
                firstName: "Upali",
                lastName: "Seneviratne",
                businessName: "Traditional Mask Workshop",
                phone: "+94712345678",
                address: "123 Craft Street",
                province: "Western",
                city: "Colombo",
                craftSpecialties: ["Mask Carving", "Wood Sculpture"],
                experienceYears: 25,
                bio: "Master craftsman specializing in traditional Sri Lankan masks with over 25 years of experience.",
                culturalBackground: "Kandyan",
                traditionalTechniques: [
                    {
                        technique: "Kolam Mask Carving",
                        description: "Traditional dance mask carving technique",
                        masterLevel: "Master"
                    }
                ],
                certifications: [
                    {
                        name: "Master Craftsman Certificate",
                        issuer: "Sri Lanka Handicrafts Board",
                        date: new Date("2020-01-15")
                    }
                ],
                isVerified: true,
                emailVerified: true,
                aiInsights: {
                    performanceScore: 92,
                    recommendations: [
                        "Optimize product photos for better visibility",
                        "Expand into international markets"
                    ]
                }
            },
            {
                artisanId: "ART0002",
                email: "pottery.collective@artisan.lk",
                password: await bcrypt.hash("password123", 10),
                firstName: "Kamani",
                lastName: "Perera",
                businessName: "Heritage Pottery Studio",
                phone: "+94712345679",
                address: "456 Clay Road",
                province: "Central",
                city: "Kandy",
                craftSpecialties: ["Pottery", "Ceramic Art"],
                experienceYears: 18,
                bio: "Traditional potter creating functional and decorative ceramics using ancient techniques.",
                culturalBackground: "Sinhalese",
                traditionalTechniques: [
                    {
                        technique: "Wheel Throwing",
                        description: "Traditional pottery wheel techniques",
                        masterLevel: "Advanced"
                    }
                ],
                isVerified: true,
                emailVerified: true
            }
        ];

        await Artisan.insertMany(artisans);

        // Seed Customers
        const customers = [
            {
                customerId: "CUST0001",
                email: "john.doe@customer.com",
                password: await bcrypt.hash("password123", 10),
                firstName: "John",
                lastName: "Doe",
                phone: "+1234567890",
                addresses: [
                    {
                        type: "Home",
                        street: "123 Main St",
                        city: "New York",
                        province: "NY",
                        country: "USA",
                        isDefault: true
                    }
                ],
                preferences: {
                    categories: ["Woodcarving", "Pottery"],
                    culturalInterests: ["traditional_crafts", "history"]
                },
                emailVerified: true
            }
        ];

        await Customer.insertMany(customers);

        // Seed Products
        const products = [
            {
                productId: "PRD0001",
                artisanId: "ART0001",
                name: "Traditional Kolam Mask",
                description: "Hand-carved traditional dance mask representing the Kolam character from Sri Lankan folk theatre.",
                culturalStory: "This mask represents a character from traditional Kolam performances, which have been part of Sri Lankan culture for over 300 years. Each mask tells a story and embodies cultural values passed down through generations.",
                culturalSignificance: "Kolam masks are integral to Sri Lankan performing arts and represent the connection between earthly and spiritual realms.",
                category: "Masks",
                subcategory: "Dance Masks",
                price: 7500,
                materials: [
                    {
                        name: "Kaduru Wood",
                        source: "Sri Lankan forests",
                        sustainability: "Sustainably sourced"
                    }
                ],
                dimensions: {
                    length: 25,
                    width: 20,
                    height: 8,
                    weight: 0.5,
                    unit: "cm"
                },
                colors: ["Red", "Black", "Gold"],
                images: [
                    {
                        url: "https://example.com/mask1.jpg",
                        altText: "Traditional Kolam Mask - Front View",
                        isPrimary: true,
                        aiQualityScore: 95
                    }
                ],
                availability: true,
                stock: 5,
                productionTime: 7,
                shippingInfo: {
                    weight: 0.8,
                    dimensions: "30x25x15 cm",
                    fragile: true,
                    internationalShipping: true
                },
                tags: ["traditional", "handcrafted", "cultural", "dance", "theatre"],
                aiData: {
                    qualityScore: 95,
                    demandPrediction: {
                        score: 85,
                        trend: "Growing",
                        bestSeasonality: ["December", "January", "February"]
                    }
                },
                ratings: {
                    average: 4.8,
                    count: 12
                },
                totalSales: 25,
                views: 156,
                featured: true
            },
            {
                productId: "PRD0002",
                artisanId: "ART0002",
                name: "Traditional Water Pot",
                description: "Handcrafted clay water pot made using ancient techniques, perfect for keeping water naturally cool.",
                culturalStory: "These water pots have been used in Sri Lankan households for centuries. The porous clay naturally cools water through evaporation, making it perfect for our tropical climate.",
                culturalSignificance: "Represents sustainable living practices and traditional craftsmanship techniques.",
                category: "Pottery",
                subcategory: "Functional Pottery",
                price: 3200,
                materials: [
                    {
                        name: "Local Clay",
                        source: "Kandy region",
                        sustainability: "Eco-friendly"
                    }
                ],
                dimensions: {
                    length: 20,
                    width: 20,
                    height: 35,
                    weight: 2.5,
                    unit: "cm"
                },
                colors: ["Terracotta", "Natural"],
                images: [
                    {
                        url: "https://example.com/pot1.jpg",
                        altText: "Traditional Clay Water Pot",
                        isPrimary: true,
                        aiQualityScore: 88
                    }
                ],
                availability: true,
                stock: 12,
                productionTime: 5,
                ratings: {
                    average: 4.5,
                    count: 8
                },
                totalSales: 18
            }
        ];

        await Product.insertMany(products);

        // Seed Suppliers
        const suppliers = [
            {
                supplierId: "SUP0001",
                companyName: "Lanka Wood Suppliers",
                email: "info@lankawood.lk",
                password: await bcrypt.hash("password123", 10),
                contactPerson: {
                    firstName: "Priya",
                    lastName: "Fernando",
                    designation: "Operations Manager",
                    phone: "+94712345680",
                    email: "priya@lankawood.lk"
                },
                address: {
                    street: "789 Timber Avenue",
                    city: "Colombo",
                    province: "Western",
                    country: "Sri Lanka"
                },
                categories: ["Wood"],
                materials: [
                    {
                        name: "Teak Wood",
                        category: "Wood",
                        description: "Premium quality teak wood",
                        unit: "kg",
                        pricePerUnit: 850,
                        minimumOrder: 10,
                        availability: true,
                        sustainabilityInfo: {
                            isEcoFriendly: true,
                            certifications: ["FSC Certified"],
                            sourceLocation: "Central Province",
                            harvestMethod: "Sustainable forestry"
                        }
                    },
                    {
                        name: "Kaduru Wood",
                        category: "Wood",
                        description: "Traditional carving wood",
                        unit: "kg",
                        pricePerUnit: 650,
                        minimumOrder: 5,
                        availability: true,
                        sustainabilityInfo: {
                            isEcoFriendly: true,
                            certifications: ["Locally sourced"],
                            sourceLocation: "Kandy District"
                        }
                    }
                ],
                ratings: {
                    average: 4.6,
                    count: 24
                },
                isVerified: true
            }
        ];

        await Supplier.insertMany(suppliers);

        // Seed Tourism Packages
        const tourismPackages = [
            {
                packageId: "PKG0001",
                providerId: "TOUR001",
                title: "Traditional Mask Carving Workshop",
                description: "Learn the ancient art of mask carving with master craftsmen in a traditional workshop setting.",
                culturalExperience: "Immerse yourself in the 300-year-old tradition of Sri Lankan mask carving",
                type: "Workshop",
                location: {
                    province: "Western",
                    city: "Colombo",
                    address: "Traditional Craft Village, Colombo 7",
                    coordinates: {
                        latitude: 6.9271,
                        longitude: 79.8612
                    }
                },
                duration: {
                    hours: 4,
                    days: 1
                },
                maxParticipants: 8,
                price: {
                    adult: 5500,
                    child: 3500,
                    currency: "LKR"
                },
                inclusions: [
                    "Workshop materials",
                    "Master craftsman guidance",
                    "Traditional lunch",
                    "Certificate of completion",
                    "Take home your creation"
                ],
                language: ["English", "Sinhala"],
                difficulty: "Easy",
                artisansInvolved: [
                    {
                        artisanId: "ART0001",
                        role: "Master Instructor",
                        skills: ["Mask Carving", "Cultural Storytelling"]
                    }
                ],
                craftsTaught: ["Basic Mask Carving", "Wood Selection", "Traditional Painting"],
                culturalElements: ["Kolam Theatre History", "Mask Symbolism", "Performance Traditions"],
                ratings: {
                    average: 4.9,
                    count: 15
                },
                totalBookings: 47,
                isActive: true,
                featured: true
            }
        ];

        await TourismPackage.insertMany(tourismPackages);

        console.log("✅ Database seeded successfully!");
        console.log("📊 Seeded data:");
        console.log(`   - ${artisans.length} Artisans`);
        console.log(`   - ${customers.length} Customers`);
        console.log(`   - ${products.length} Products`);
        console.log(`   - ${suppliers.length} Suppliers`);
        console.log(`   - ${tourismPackages.length} Tourism Packages`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seedData();