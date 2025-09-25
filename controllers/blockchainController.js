// controllers/blockchainController.js
import crypto from "crypto";
import jwt from "jsonwebtoken";

export async function verifyArtisanIdentity(req, res) {
    try {
        const { artisanId, skillsCertificates, workSamples } = req.body;

        // Simulate blockchain identity verification process
        const verificationHash = crypto
            .createHash('sha256')
            .update(`${artisanId}:${Date.now()}:${JSON.stringify(skillsCertificates)}`)
            .digest('hex');

        // Create blockchain record simulation
        const blockchainRecord = {
            transactionId: `TX_${Date.now()}`,
            blockHash: verificationHash,
            timestamp: new Date().toISOString(),
            artisanId: artisanId,
            verificationData: {
                skills: skillsCertificates.map(cert => ({
                    skill: cert.skill,
                    level: cert.level,
                    certifyingBody: cert.certifyingBody,
                    hash: crypto.createHash('md5').update(cert.documentUrl).digest('hex')
                })),
                workSamples: workSamples.map(sample => ({
                    title: sample.title,
                    imageHash: crypto.createHash('md5').update(sample.imageUrl).digest('hex'),
                    description: sample.description
                }))
            },
            verificationStatus: "pending_consensus",
            consensusNodes: 3,
            requiredConfirmations: 2
        };

        // Simulate consensus process
        setTimeout(async () => {
            blockchainRecord.verificationStatus = "verified";
            blockchainRecord.confirmations = 3;
            
            // Update artisan verification status
            // await Artisan.findOneAndUpdate(
            //     { artisanId },
            //     { 
            //         isVerified: true,
            //         "blockchainData.identityHash": verificationHash,
            //         "blockchainData.verificationDate": new Date()
            //     }
            // );
        }, 5000);

        res.json({
            message: "Artisan identity verification initiated",
            blockchainRecord: blockchainRecord,
            estimatedVerificationTime: "3-5 minutes"
        });

    } catch (err) {
        console.error("Blockchain verification error:", err);
        res.status(500).json({
            message: "Failed to initiate blockchain verification",
            error: err.message
        });
    }
}

export async function generateNFTCertificate(req, res) {
    try {
        const { productId, artisanId, certificateType } = req.body;

        // Generate unique NFT metadata
        const nftMetadata = {
            tokenId: `NFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `ArtisanConnect Certificate - ${certificateType}`,
            description: `Authentic ${certificateType} certificate for product ${productId} by artisan ${artisanId}`,
            image: `https://nft.artisanconnect.com/certificates/${productId}.jpg`,
            attributes: [
                { trait_type: "Certificate Type", value: certificateType },
                { trait_type: "Artisan ID", value: artisanId },
                { trait_type: "Product ID", value: productId },
                { trait_type: "Issue Date", value: new Date().toISOString() },
                { trait_type: "Blockchain", value: "Ethereum" },
                { trait_type: "Standard", value: "ERC-721" }
            ],
            external_url: `https://artisanconnect.com/products/${productId}`,
            animation_url: `https://nft.artisanconnect.com/animations/${productId}.mp4`
        };

        // Simulate smart contract deployment
        const contractAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
        const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;

        const nftCertificate = {
            tokenId: nftMetadata.tokenId,
            contractAddress: contractAddress,
            transactionHash: transactionHash,
            metadata: nftMetadata,
            mintedAt: new Date(),
            owner: artisanId,
            verified: true,
            authenticity: {
                digitalSignature: crypto
                    .createHash('sha256')
                    .update(`${productId}:${artisanId}:${Date.now()}`)
                    .digest('hex'),
                merkleProof: generateMerkleProof(productId, artisanId),
                ipfsHash: `Qm${crypto.randomBytes(22).toString('hex')}`
            }
        };

        // Store NFT data in product record
        // await Product.findOneAndUpdate(
        //     { productId },
        //     {
        //         "blockchainData.nftId": nftMetadata.tokenId,
        //         "blockchainData.authenticityCertificate": transactionHash
        //     }
        // );

        res.json({
            message: "NFT certificate generated successfully",
            nftCertificate: nftCertificate,
            viewUrl: `https://opensea.io/assets/ethereum/${contractAddress}/${nftMetadata.tokenId}`
        });

    } catch (err) {
        console.error("NFT generation error:", err);
        res.status(500).json({
            message: "Failed to generate NFT certificate",
            error: err.message
        });
    }
}

export async function verifyProductAuthenticity(req, res) {
    try {
        const { productId, nftId, digitalSignature } = req.body;

        // Simulate blockchain verification
        const verificationResult = {
            isAuthentic: true,
            productId: productId,
            nftId: nftId,
            verificationHash: crypto
                .createHash('sha256')
                .update(`${productId}:${nftId}:${digitalSignature}`)
                .digest('hex'),
            blockchainConfirmations: 12,
            lastVerified: new Date(),
            authenticity: {
                score: 98.5,
                factors: [
                    { factor: "Digital Signature Match", status: "✓ Verified", weight: 40 },
                    { factor: "NFT Ownership Chain", status: "✓ Verified", weight: 30 },
                    { factor: "Artisan Identity", status: "✓ Verified", weight: 20 },
                    { factor: "Creation Timestamp", status: "✓ Verified", weight: 10 }
                ]
            },
            ownershipHistory: [
                {
                    owner: "Artisan Workshop",
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    transactionType: "Creation"
                },
                {
                    owner: "ArtisanConnect Platform",
                    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                    transactionType: "Listing"
                }
            ],
            warningFlags: []
        };

        // Add warning flags if authenticity score is low
        if (verificationResult.authenticity.score < 90) {
            verificationResult.warningFlags.push("Low authenticity score detected");
        }

        res.json({
            message: "Product authenticity verification completed",
            verification: verificationResult
        });

    } catch (err) {
        console.error("Authenticity verification error:", err);
        res.status(500).json({
            message: "Failed to verify product authenticity",
            error: err.message
        });
    }
}

export async function createSmartContract(req, res) {
    try {
        const { contractType, parties, terms, conditions } = req.body;

        const contractAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
        const deploymentHash = `0x${crypto.randomBytes(32).toString('hex')}`;

        const smartContract = {
            contractId: `SC_${Date.now()}`,
            contractAddress: contractAddress,
            deploymentHash: deploymentHash,
            contractType: contractType,
            parties: parties,
            terms: terms,
            conditions: conditions,
            status: "deployed",
            createdAt: new Date(),
            abi: generateContractABI(contractType),
            bytecode: `0x${crypto.randomBytes(100).toString('hex')}`,
            gasUsed: Math.floor(Math.random() * 200000) + 100000,
            network: "ethereum",
            version: "1.0"
        };

        res.json({
            message: "Smart contract created successfully",
            contract: smartContract,
            interactionUrl: `https://etherscan.io/address/${contractAddress}`
        });

    } catch (err) {
        console.error("Smart contract creation error:", err);
        res.status(500).json({
            message: "Failed to create smart contract",
            error: err.message
        });
    }
}

export async function executeSmartContract(req, res) {
    try {
        const { contractId, functionName, parameters, gasLimit } = req.body;

        const executionResult = {
            transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
            contractId: contractId,
            functionName: functionName,
            parameters: parameters,
            gasUsed: Math.floor(Math.random() * (gasLimit || 100000)),
            gasPrice: "20000000000", // 20 gwei
            status: "success",
            executedAt: new Date(),
            blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
            events: [
                {
                    eventName: `${functionName}Executed`,
                    data: parameters,
                    topics: [`0x${crypto.randomBytes(32).toString('hex')}`]
                }
            ],
            returnValue: generateReturnValue(functionName, parameters)
        };

        res.json({
            message: "Smart contract executed successfully",
            execution: executionResult
        });

    } catch (err) {
        console.error("Smart contract execution error:", err);
        res.status(500).json({
            message: "Failed to execute smart contract",
            error: err.message
        });
    }
}

export async function getBlockchainHistory(req, res) {
    try {
        const { entityId } = req.params;
        const { entityType } = req.query;

        // Simulate blockchain history retrieval
        const history = {
            entityId: entityId,
            entityType: entityType,
            totalTransactions: Math.floor(Math.random() * 50) + 10,
            transactions: []
        };

        // Generate sample transaction history
        for (let i = 0; i < Math.min(10, history.totalTransactions); i++) {
            const tx = {
                transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
                blockNumber: Math.floor(Math.random() * 1000) + 15000000 - i * 100,
                timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                type: ["creation", "transfer", "update", "verification"][Math.floor(Math.random() * 4)],
                from: `0x${crypto.randomBytes(20).toString('hex')}`,
                to: `0x${crypto.randomBytes(20).toString('hex')}`,
                value: Math.floor(Math.random() * 1000000),
                gasUsed: Math.floor(Math.random() * 100000) + 21000,
                status: "success"
            };
            history.transactions.push(tx);
        }

        res.json({
            message: "Blockchain history retrieved successfully",
            history: history
        });

    } catch (err) {
        console.error("Blockchain history error:", err);
        res.status(500).json({
            message: "Failed to retrieve blockchain history",
            error: err.message
        });
    }
}

// Helper functions
function generateMerkleProof(productId, artisanId) {
    const hashes = [
        crypto.createHash('sha256').update(productId).digest('hex'),
        crypto.createHash('sha256').update(artisanId).digest('hex'),
        crypto.createHash('sha256').update(Date.now().toString()).digest('hex')
    ];
    
    return hashes.map(hash => `0x${hash}`);
}

function generateContractABI(contractType) {
    const abis = {
        "supply_chain": [
            {
                "name": "updateSupplyStatus",
                "type": "function",
                "inputs": [{"type": "string", "name": "status"}]
            },
            {
                "name": "verifyDelivery",
                "type": "function",
                "inputs": [{"type": "address", "name": "recipient"}]
            }
        ],
        "payment": [
            {
                "name": "releasePayment",
                "type": "function",
                "inputs": [{"type": "uint256", "name": "amount"}]
            }
        ]
    };
    
    return abis[contractType] || [];
}

function generateReturnValue(functionName, parameters) {
    if (functionName.includes("get") || functionName.includes("read")) {
        return { success: true, data: parameters };
    }
    return { success: true, transactionComplete: true };
}

// controllers/iotController.js
export async function registerIoTDevice(req, res) {
    try {
        const { deviceType, location, artisanId, specifications } = req.body;

        const deviceId = `IOT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const iotDevice = {
            deviceId: deviceId,
            deviceType: deviceType,
            location: location,
            artisanId: artisanId,
            specifications: specifications,
            status: "active",
            registeredAt: new Date(),
            lastHeartbeat: new Date(),
            apiKey: crypto.randomBytes(32).toString('hex'),
            firmware: {
                version: "1.2.3",
                lastUpdate: new Date()
            },
            connectivity: {
                protocol: "MQTT",
                endpoint: `mqtt.artisanconnect.com:8883`,
                tlsEnabled: true
            },
            dataPoints: []
        };

        res.status(201).json({
            message: "IoT device registered successfully",
            device: iotDevice,
            connectionInstructions: {
                mqttBroker: "mqtt.artisanconnect.com",
                port: 8883,
                topic: `iot/${artisanId}/${deviceId}`,
                authToken: iotDevice.apiKey
            }
        });

    } catch (err) {
        console.error("IoT device registration error:", err);
        res.status(500).json({
            message: "Failed to register IoT device",
            error: err.message
        });
    }
}

export async function updateDeviceStatus(req, res) {
    try {
        const { deviceId } = req.params;
        const { status, sensorData, metadata } = req.body;

        const updateResult = {
            deviceId: deviceId,
            previousStatus: "active", // Would come from database
            newStatus: status,
            updatedAt: new Date(),
            sensorData: sensorData,
            metadata: metadata
        };

        // Process sensor data based on device type
        if (sensorData) {
            const processedData = await processSensorData(deviceId, sensorData);
            updateResult.insights = processedData.insights;
            updateResult.alerts = processedData.alerts;
        }

        res.json({
            message: "Device status updated successfully",
            update: updateResult
        });

    } catch (err) {
        console.error("Device status update error:", err);
        res.status(500).json({
            message: "Failed to update device status",
            error: err.message
        });
    }
}

export async function getDeviceData(req, res) {
    try {
        const { deviceId } = req.params;
        const { timeRange = "24h", dataType } = req.query;

        // Simulate historical data retrieval
        const timeRangeHours = timeRange.replace('h', '');
        const dataPoints = [];
        const now = new Date();

        for (let i = 0; i < parseInt(timeRangeHours); i++) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            dataPoints.unshift({
                timestamp: timestamp,
                temperature: 22 + Math.random() * 6, // 22-28°C
                humidity: 45 + Math.random() * 20,   // 45-65%
                lightLevel: 200 + Math.random() * 600, // 200-800 lux
                airQuality: 70 + Math.random() * 25,   // 70-95%
                vibration: Math.random() * 0.5,        // 0-0.5g
                soundLevel: 30 + Math.random() * 20    // 30-50 dB
            });
        }

        const analytics = {
            averages: {
                temperature: dataPoints.reduce((sum, dp) => sum + dp.temperature, 0) / dataPoints.length,
                humidity: dataPoints.reduce((sum, dp) => sum + dp.humidity, 0) / dataPoints.length,
                lightLevel: dataPoints.reduce((sum, dp) => sum + dp.lightLevel, 0) / dataPoints.length
            },
            trends: {
                temperature: Math.random() > 0.5 ? "increasing" : "decreasing",
                humidity: Math.random() > 0.5 ? "stable" : "fluctuating"
            },
            alerts: generateEnvironmentAlerts(dataPoints[dataPoints.length - 1])
        };

        res.json({
            message: "Device data retrieved successfully",
            deviceId: deviceId,
            timeRange: timeRange,
            dataPoints: dataPoints,
            analytics: analytics
        });

    } catch (err) {
        console.error("Get device data error:", err);
        res.status(500).json({
            message: "Failed to retrieve device data",
            error: err.message
        });
    }
}

export async function getAllDevices(req, res) {
    try {
        const { artisanId } = req.query;
        
        let query = {};
        if (artisanId) query.artisanId = artisanId;
        if (req.user.role === "artisan") query.artisanId = req.user.artisanId;

        // Simulate device list retrieval
        const devices = [
            {
                deviceId: "IOT_ENV_001",
                deviceType: "environmental_sensor",
                location: "Workshop Area 1",
                status: "active",
                lastHeartbeat: new Date(),
                batteryLevel: 87
            },
            {
                deviceId: "IOT_INV_002",
                deviceType: "inventory_scanner",
                location: "Storage Room",
                status: "active",
                lastHeartbeat: new Date(),
                batteryLevel: 92
            },
            {
                deviceId: "IOT_PROD_003",
                deviceType: "production_tracker",
                location: "Workbench 1",
                status: "maintenance",
                lastHeartbeat: new Date(Date.now() - 2 * 60 * 60 * 1000),
                batteryLevel: 34
            }
        ];

        res.json({
            message: "Devices retrieved successfully",
            devices: devices.filter(device => !artisanId || device.artisanId === artisanId),
            totalCount: devices.length
        });

    } catch (err) {
        console.error("Get devices error:", err);
        res.status(500).json({
            message: "Failed to retrieve devices",
            error: err.message
        });
    }
}

export async function processEnvironmentData(req, res) {
    try {
        const { deviceId, readings, location } = req.body;

        const environmentalAnalysis = {
            deviceId: deviceId,
            location: location,
            timestamp: new Date(),
            readings: readings,
            analysis: {
                optimalityScore: calculateOptimalityScore(readings),
                recommendations: generateEnvironmentRecommendations(readings),
                alerts: generateEnvironmentAlerts(readings),
                trends: analyzeEnvironmentTrends(readings)
            },
            actions: {
                autoAdjustments: [],
                manualRecommendations: []
            }
        };

        // Generate auto-adjustments if integrated with smart systems
        if (readings.temperature > 28) {
            environmentalAnalysis.actions.autoAdjustments.push({
                system: "HVAC",
                action: "increase_cooling",
                value: 2
            });
        }

        if (readings.humidity > 70) {
            environmentalAnalysis.actions.manualRecommendations.push({
                action: "Enable dehumidifier",
                reason: "High humidity may affect material quality"
            });
        }

        res.json({
            message: "Environment data processed successfully",
            analysis: environmentalAnalysis
        });

    } catch (err) {
        console.error("Environment processing error:", err);
        res.status(500).json({
            message: "Failed to process environment data",
            error: err.message
        });
    }
}

export async function getInventoryStatus(req, res) {
    try {
        const { artisanId } = req.params;

        // Simulate inventory data from IoT sensors
        const inventoryStatus = {
            artisanId: artisanId,
            lastUpdated: new Date(),
            materials: [
                {
                    materialId: "MAT_001",
                    name: "Teak Wood",
                    currentStock: 45.5,
                    unit: "kg",
                    minLevel: 20,
                    maxLevel: 100,
                    status: "adequate",
                    location: "Storage A-1",
                    quality: {
                        score: 92,
                        moistureContent: 12.5,
                        temperature: 24.2
                    },
                    iotSensor: {
                        deviceId: "IOT_INV_002",
                        lastReading: new Date(),
                        batteryLevel: 88
                    }
                },
                {
                    materialId: "MAT_002",
                    name: "Clay",
                    currentStock: 15,
                    unit: "kg",
                    minLevel: 25,
                    maxLevel: 80,
                    status: "low",
                    location: "Storage B-2",
                    quality: {
                        score: 85,
                        moisture: 18.3,
                        temperature: 23.8
                    },
                    alerts: ["Stock below minimum level", "Reorder recommended"]
                }
            ],
            summary: {
                totalMaterials: 2,
                lowStockCount: 1,
                adequateStockCount: 1,
                overStockCount: 0
            },
            recommendations: [
                "Reorder Clay material - current stock below minimum",
                "Monitor moisture levels in Teak Wood storage"
            ]
        };

        res.json({
            message: "Inventory status retrieved successfully",
            inventory: inventoryStatus
        });

    } catch (err) {
        console.error("Inventory status error:", err);
        res.status(500).json({
            message: "Failed to retrieve inventory status",
            error: err.message
        });
    }
}

export async function generateProductionReport(req, res) {
    try {
        const { artisanId } = req.params;
        const { period = "week" } = req.query;

        const productionReport = {
            artisanId: artisanId,
            period: period,
            reportGeneratedAt: new Date(),
            summary: {
                totalProductionHours: 42.5,
                completedItems: 8,
                averageProductionTime: 5.3, // hours per item
                efficiency: 87.2, // percentage
                qualityScore: 94.1
            },
            dailyBreakdown: [],
            materialUsage: [
                {
                    material: "Teak Wood",
                    quantityUsed: 12.5,
                    unit: "kg",
                    cost: 2500,
                    efficiency: 92.3
                },
                {
                    material: "Varnish",
                    quantityUsed: 0.8,
                    unit: "L",
                    cost: 800,
                    efficiency: 88.7
                }
            ],
            environmentalConditions: {
                averageTemperature: 25.8,
                averageHumidity: 58.2,
                optimalConditionsPercentage: 78.5
            },
            insights: [
                "Production efficiency increased by 12% compared to last week",
                "Material usage optimization saved approximately LKR 300",
                "Recommend maintaining current temperature settings"
            ],
            recommendations: [
                "Schedule maintenance for equipment during low production periods",
                "Consider bulk ordering for frequently used materials",
                "Monitor humidity levels during rainy season"
            ]
        };

        // Generate daily breakdown for the period
        const days = period === "week" ? 7 : period === "month" ? 30 : 7;
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            productionReport.dailyBreakdown.unshift({
                date: date,
                hoursWorked: Math.random() * 8 + 2, // 2-10 hours
                itemsCompleted: Math.floor(Math.random() * 3) + 0, // 0-2 items
                efficiency: Math.random() * 20 + 80, // 80-100%
                environmentalScore: Math.random() * 20 + 80
            });
        }

        res.json({
            message: "Production report generated successfully",
            report: productionReport
        });

    } catch (err) {
        console.error("Production report error:", err);
        res.status(500).json({
            message: "Failed to generate production report",
            error: err.message
        });
    }
}

// Helper functions for IoT processing
async function processSensorData(deviceId, sensorData) {
    const insights = [];
    const alerts = [];

    // Temperature analysis
    if (sensorData.temperature) {
        if (sensorData.temperature < 18) {
            alerts.push({ type: "WARNING", message: "Temperature too low for optimal working conditions" });
        } else if (sensorData.temperature > 30) {
            alerts.push({ type: "WARNING", message: "High temperature detected, may affect material quality" });
        } else {
            insights.push("Temperature within optimal range");
        }
    }

    // Humidity analysis
    if (sensorData.humidity) {
        if (sensorData.humidity > 70) {
            alerts.push({ type: "ALERT", message: "High humidity may cause material degradation" });
        } else if (sensorData.humidity < 30) {
            alerts.push({ type: "WARNING", message: "Low humidity may cause cracking in wooden materials" });
        }
    }

    return { insights, alerts };
}

function calculateOptimalityScore(readings) {
    let score = 100;
    
    // Temperature scoring
    if (readings.temperature < 20 || readings.temperature > 28) {
        score -= 15;
    }
    
    // Humidity scoring
    if (readings.humidity < 40 || readings.humidity > 65) {
        score -= 10;
    }
    
    // Light level scoring
    if (readings.lightLevel < 300) {
        score -= 20;
    }
    
    // Air quality scoring
    if (readings.airQuality && readings.airQuality < 80) {
        score -= 15;
    }
    
    return Math.max(score, 0);
}

function generateEnvironmentAlerts(readings) {
    const alerts = [];
    
    if (readings.temperature > 28) {
        alerts.push({
            type: "HIGH_TEMPERATURE",
            severity: "medium",
            message: "Temperature above optimal range",
            recommendation: "Increase ventilation or activate cooling system"
        });
    }
    
    if (readings.humidity > 70) {
        alerts.push({
            type: "HIGH_HUMIDITY",
            severity: "medium", 
            message: "Humidity levels may affect material quality",
            recommendation: "Consider using dehumidifier"
        });
    }
    
    if (readings.lightLevel < 300) {
        alerts.push({
            type: "LOW_LIGHT",
            severity: "low",
            message: "Insufficient lighting for detailed work",
            recommendation: "Add supplementary lighting"
        });
    }
    
    return alerts;
}

function analyzeEnvironmentTrends(readings) {
    // This would analyze historical data in a real implementation
    return {
        temperature: {
            trend: "stable",
            change: "+0.2°C over last 24h"
        },
        humidity: {
            trend: "increasing",
            change: "+3% over last 24h"
        },
        lightLevel: {
            trend: "stable",
            change: "No significant change"
        }
    };
}