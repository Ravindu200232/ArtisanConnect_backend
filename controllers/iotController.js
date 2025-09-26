// controllers/iotController.js
import crypto from "crypto";
import Artisan from "../models/artisan.js";
import { Product } from "../models/product.js";

// Register IoT Device
export async function registerIoTDevice(req, res) {
    try {
        const { deviceType, location, artisanId, specifications } = req.body;

        // Check if artisan exists
        const artisan = await Artisan.findOne({ artisanId });
        if (!artisan) {
            return res.status(404).json({
                message: "Artisan not found"
            });
        }

        // Check authorization
        if (req.user.role !== "admin" && req.user.artisanId !== artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

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

        // Store device info in artisan record
        await Artisan.findOneAndUpdate(
            { artisanId },
            {
                $push: {
                    "iotWorkshopData.devices": {
                        deviceId: deviceId,
                        deviceType: deviceType,
                        location: location,
                        status: "active"
                    }
                }
            }
        );

        res.status(201).json({
            message: "IoT device registered successfully",
            device: iotDevice,
            connectionInstructions: {
                mqttBroker: "mqtt.artisanconnect.com",
                port: 8883,
                topic: `iot/${artisanId}/${deviceId}`,
                authToken: iotDevice.apiKey,
                dataFormat: "JSON",
                heartbeatInterval: "30 seconds"
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

// Update Device Status and Receive Sensor Data
export async function updateDeviceStatus(req, res) {
    try {
        const { deviceId } = req.params;
        const { status, sensorData, metadata } = req.body;

        // Validate device ownership
        const artisan = await Artisan.findOne({
            "iotWorkshopData.devices.deviceId": deviceId
        });

        if (!artisan) {
            return res.status(404).json({
                message: "Device not found"
            });
        }

        if (req.user.role !== "admin" && req.user.artisanId !== artisan.artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const updateResult = {
            deviceId: deviceId,
            previousStatus: "active", 
            newStatus: status,
            updatedAt: new Date(),
            sensorData: sensorData,
            metadata: metadata
        };

        // Process sensor data based on device type
        if (sensorData) {
            const processedData = await processSensorData(deviceId, sensorData, artisan.artisanId);
            updateResult.insights = processedData.insights;
            updateResult.alerts = processedData.alerts;
            updateResult.recommendations = processedData.recommendations;
        }

        // Update artisan's IoT data
        if (sensorData) {
            const updateFields = {};
            
            if (sensorData.temperature) {
                updateFields["iotWorkshopData.temperature"] = sensorData.temperature;
            }
            if (sensorData.humidity) {
                updateFields["iotWorkshopData.humidity"] = sensorData.humidity;
            }
            if (sensorData.lightLevel) {
                updateFields["iotWorkshopData.lightLevel"] = sensorData.lightLevel;
            }

            await Artisan.findOneAndUpdate(
                { artisanId: artisan.artisanId },
                updateFields
            );
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

// Get Device Historical Data
export async function getDeviceData(req, res) {
    try {
        const { deviceId } = req.params;
        const { timeRange = "24h", dataType } = req.query;

        // Validate device access
        const artisan = await Artisan.findOne({
            "iotWorkshopData.devices.deviceId": deviceId
        });

        if (!artisan) {
            return res.status(404).json({
                message: "Device not found"
            });
        }

        if (req.user.role !== "admin" && req.user.artisanId !== artisan.artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Generate historical data simulation
        const timeRangeHours = parseInt(timeRange.replace('h', ''));
        const dataPoints = [];
        const now = new Date();

        for (let i = 0; i < timeRangeHours; i++) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            dataPoints.unshift({
                timestamp: timestamp,
                temperature: 22 + Math.random() * 6, // 22-28°C
                humidity: 45 + Math.random() * 20,   // 45-65%
                lightLevel: 200 + Math.random() * 600, // 200-800 lux
                airQuality: 70 + Math.random() * 25,   // 70-95%
                vibration: Math.random() * 0.5,        // 0-0.5g
                soundLevel: 30 + Math.random() * 20,   // 30-50 dB
                productivity: 60 + Math.random() * 40  // 60-100%
            });
        }

        // Filter by data type if specified
        if (dataType) {
            dataPoints.forEach(point => {
                Object.keys(point).forEach(key => {
                    if (key !== 'timestamp' && key !== dataType) {
                        delete point[key];
                    }
                });
            });
        }

        const analytics = {
            averages: calculateAverages(dataPoints),
            trends: analyzeTrends(dataPoints),
            alerts: generateEnvironmentAlerts(dataPoints[dataPoints.length - 1]),
            optimalityScore: calculateOptimalityScore(dataPoints[dataPoints.length - 1])
        };

        res.json({
            message: "Device data retrieved successfully",
            deviceId: deviceId,
            timeRange: timeRange,
            dataType: dataType || "all",
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

// Get All IoT Devices for Artisan
export async function getAllDevices(req, res) {
    try {
        const { artisanId } = req.query;
        let targetArtisanId = artisanId;

        if (req.user.role === "artisan") {
            targetArtisanId = req.user.artisanId;
        } else if (req.user.role !== "admin" && !artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const query = targetArtisanId ? { artisanId: targetArtisanId } : {};
        const artisans = await Artisan.find(query).select('artisanId businessName iotWorkshopData');

        const allDevices = [];
        artisans.forEach(artisan => {
            if (artisan.iotWorkshopData && artisan.iotWorkshopData.devices) {
                artisan.iotWorkshopData.devices.forEach(device => {
                    allDevices.push({
                        ...device.toObject(),
                        artisanId: artisan.artisanId,
                        businessName: artisan.businessName,
                        lastHeartbeat: new Date(Date.now() - Math.random() * 10 * 60 * 1000), // Random within 10 mins
                        batteryLevel: Math.floor(Math.random() * 40) + 60 // 60-100%
                    });
                });
            }
        });

        res.json({
            message: "Devices retrieved successfully",
            devices: allDevices,
            totalCount: allDevices.length,
            activeDevices: allDevices.filter(d => d.status === 'active').length
        });

    } catch (err) {
        console.error("Get devices error:", err);
        res.status(500).json({
            message: "Failed to retrieve devices",
            error: err.message
        });
    }
}

// Process Environmental Data
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
                trends: analyzeEnvironmentTrends([readings])
            },
            actions: {
                autoAdjustments: [],
                manualRecommendations: []
            }
        };

        // Generate auto-adjustments for smart workshop systems
        if (readings.temperature > 28) {
            environmentalAnalysis.actions.autoAdjustments.push({
                system: "HVAC",
                action: "increase_cooling",
                value: 2,
                reason: "Temperature above optimal range"
            });
        }

        if (readings.temperature < 20) {
            environmentalAnalysis.actions.autoAdjustments.push({
                system: "HVAC", 
                action: "increase_heating",
                value: 3,
                reason: "Temperature below optimal range"
            });
        }

        if (readings.humidity > 70) {
            environmentalAnalysis.actions.manualRecommendations.push({
                action: "Enable dehumidifier",
                reason: "High humidity may affect material quality and workshop conditions"
            });
        }

        if (readings.lightLevel < 300) {
            environmentalAnalysis.actions.manualRecommendations.push({
                action: "Increase lighting",
                reason: "Insufficient light for detailed craft work"
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

// Get Inventory Status with IoT Sensors
export async function getInventoryStatus(req, res) {
    try {
        const { artisanId } = req.params;

        // Check authorization
        if (req.user.role !== "admin" && req.user.artisanId !== artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

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
                        temperature: 24.2,
                        lastChecked: new Date()
                    },
                    iotSensor: {
                        deviceId: "IOT_INV_002",
                        lastReading: new Date(),
                        batteryLevel: 88,
                        signalStrength: 95
                    },
                    usage: {
                        dailyConsumption: 2.3,
                        weeklyTrend: "stable",
                        estimatedDaysRemaining: 18
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
                        temperature: 23.8,
                        lastChecked: new Date()
                    },
                    iotSensor: {
                        deviceId: "IOT_INV_003",
                        lastReading: new Date(),
                        batteryLevel: 92,
                        signalStrength: 87
                    },
                    alerts: ["Stock below minimum level", "Reorder recommended"],
                    usage: {
                        dailyConsumption: 1.8,
                        weeklyTrend: "increasing",
                        estimatedDaysRemaining: 8
                    }
                },
                {
                    materialId: "MAT_003",
                    name: "Natural Dyes",
                    currentStock: 8.2,
                    unit: "L",
                    minLevel: 5,
                    maxLevel: 20,
                    status: "adequate",
                    location: "Chemical Storage",
                    quality: {
                        score: 95,
                        ph: 6.8,
                        temperature: 22.1,
                        viscosity: "normal",
                        lastChecked: new Date()
                    },
                    iotSensor: {
                        deviceId: "IOT_INV_004",
                        lastReading: new Date(),
                        batteryLevel: 76,
                        signalStrength: 92
                    }
                }
            ],
            summary: {
                totalMaterials: 3,
                lowStockCount: 1,
                adequateStockCount: 2,
                overStockCount: 0,
                totalValue: 45750, // LKR
                averageQuality: 90.7
            },
            predictions: {
                nextReorderDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                criticalMaterials: ["Clay"],
                estimatedMonthlyConsumption: {
                    "Teak Wood": 69,
                    "Clay": 54,
                    "Natural Dyes": 12.5
                }
            },
            recommendations: [
                "Reorder Clay material - current stock below minimum",
                "Monitor moisture levels in Teak Wood storage",
                "Consider bulk purchasing for Natural Dyes during next supplier visit"
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

// Generate Production Report with IoT Analytics
export async function generateProductionReport(req, res) {
    try {
        const { artisanId } = req.params;
        const { period = "week" } = req.query;

        // Check authorization
        if (req.user.role !== "admin" && req.user.artisanId !== artisanId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const days = period === "week" ? 7 : period === "month" ? 30 : 7;
        
        const productionReport = {
            artisanId: artisanId,
            period: period,
            reportGeneratedAt: new Date(),
            summary: {
                totalProductionHours: 42.5,
                completedItems: 8,
                averageProductionTime: 5.3, // hours per item
                efficiency: 87.2, // percentage
                qualityScore: 94.1,
                revenue: 67500 // LKR
            },
            dailyBreakdown: [],
            materialUsage: [
                {
                    material: "Teak Wood",
                    quantityUsed: 12.5,
                    unit: "kg",
                    cost: 10625, // LKR
                    efficiency: 92.3,
                    waste: 0.8 // kg
                },
                {
                    material: "Natural Varnish",
                    quantityUsed: 0.8,
                    unit: "L",
                    cost: 800,
                    efficiency: 88.7,
                    waste: 0.1 // L
                }
            ],
            environmentalConditions: {
                averageTemperature: 25.8,
                averageHumidity: 58.2,
                averageLightLevel: 520,
                optimalConditionsPercentage: 78.5,
                environmentalImpactOnQuality: "Positive"
            },
            productivityMetrics: {
                peakHours: ["9:00-11:00", "14:00-16:00"],
                lowEfficiencyPeriods: ["12:00-13:00"],
                toolUsageStats: {
                    chisels: 24.5, // hours
                    sandpaper: 8.2,
                    brushes: 6.8
                }
            },
            insights: [
                "Production efficiency increased by 12% compared to last week",
                "Material usage optimization saved approximately LKR 300",
                "Optimal environmental conditions maintained 78.5% of the time",
                "Peak productivity observed during morning hours"
            ],
            recommendations: [
                "Schedule complex tasks during peak efficiency hours (9-11 AM)",
                "Consider installing humidity control for rainy season",
                "Implement predictive maintenance for tools based on usage data",
                "Optimize lighting in afternoon work sessions"
            ],
            alerts: [
                {
                    type: "maintenance",
                    message: "Chisel set requires sharpening based on usage patterns",
                    priority: "medium"
                }
            ]
        };

        // Generate daily breakdown
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            productionReport.dailyBreakdown.unshift({
                date: date,
                hoursWorked: Math.random() * 6 + 4, // 4-10 hours
                itemsCompleted: Math.floor(Math.random() * 3), // 0-2 items
                efficiency: Math.random() * 20 + 80, // 80-100%
                environmentalScore: Math.random() * 20 + 80,
                qualityScore: Math.random() * 15 + 85,
                revenue: Math.floor(Math.random() * 10000) + 5000 // LKR 5000-15000
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

// Helper Functions
async function processSensorData(deviceId, sensorData, artisanId) {
    const insights = [];
    const alerts = [];
    const recommendations = [];

    // Temperature analysis
    if (sensorData.temperature) {
        if (sensorData.temperature < 18) {
            alerts.push({ 
                type: "WARNING", 
                severity: "medium",
                message: "Temperature too low for optimal working conditions",
                value: sensorData.temperature
            });
            recommendations.push("Consider heating the workshop area");
        } else if (sensorData.temperature > 30) {
            alerts.push({ 
                type: "WARNING",
                severity: "high", 
                message: "High temperature may affect material quality and worker comfort",
                value: sensorData.temperature
            });
            recommendations.push("Improve ventilation or add cooling");
        } else {
            insights.push("Temperature within optimal range for craft work");
        }
    }

    // Humidity analysis
    if (sensorData.humidity) {
        if (sensorData.humidity > 70) {
            alerts.push({ 
                type: "ALERT",
                severity: "medium",
                message: "High humidity may cause material degradation",
                value: sensorData.humidity
            });
            recommendations.push("Use dehumidifier to protect materials");
        } else if (sensorData.humidity < 30) {
            alerts.push({ 
                type: "WARNING",
                severity: "low",
                message: "Low humidity may cause cracking in wooden materials",
                value: sensorData.humidity
            });
            recommendations.push("Consider adding humidity to prevent wood cracking");
        } else {
            insights.push("Humidity levels are suitable for material preservation");
        }
    }

    // Light level analysis
    if (sensorData.lightLevel) {
        if (sensorData.lightLevel < 300) {
            alerts.push({
                type: "INFO",
                severity: "low",
                message: "Insufficient lighting for detailed work",
                value: sensorData.lightLevel
            });
            recommendations.push("Add task lighting for better visibility");
        } else {
            insights.push("Lighting conditions are adequate for craft work");
        }
    }

    return { insights, alerts, recommendations };
}

function calculateAverages(dataPoints) {
    const totals = {};
    const counts = {};

    dataPoints.forEach(point => {
        Object.keys(point).forEach(key => {
            if (key !== 'timestamp' && typeof point[key] === 'number') {
                totals[key] = (totals[key] || 0) + point[key];
                counts[key] = (counts[key] || 0) + 1;
            }
        });
    });

    const averages = {};
    Object.keys(totals).forEach(key => {
        averages[key] = parseFloat((totals[key] / counts[key]).toFixed(2));
    });

    return averages;
}

function analyzeTrends(dataPoints) {
    if (dataPoints.length < 2) return {};

    const trends = {};
    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];

    Object.keys(first).forEach(key => {
        if (key !== 'timestamp' && typeof first[key] === 'number') {
            const change = last[key] - first[key];
            const changePercent = (change / first[key]) * 100;
            
            if (Math.abs(changePercent) < 2) {
                trends[key] = "stable";
            } else if (changePercent > 0) {
                trends[key] = "increasing";
            } else {
                trends[key] = "decreasing";
            }
        }
    });

    return trends;
}

function generateEnvironmentRecommendations(readings) {
    const recommendations = [];
    
    if (readings.temperature < 20) {
        recommendations.push("Consider increasing workshop temperature for optimal working conditions");
    } else if (readings.temperature > 28) {
        recommendations.push("Workshop temperature is high, ensure proper ventilation");
    }
    
    if (readings.humidity < 30) {
        recommendations.push("Low humidity detected, may affect certain materials like wood");
    } else if (readings.humidity > 70) {
        recommendations.push("High humidity levels may impact drying times and material quality");
    }
    
    if (readings.lightLevel < 300) {
        recommendations.push("Insufficient lighting for detailed craft work, consider additional lighting");
    }

    if (readings.airQuality && readings.airQuality < 70) {
        recommendations.push("Air quality is below optimal levels, improve ventilation");
    }
    
    return recommendations;
}

function generateEnvironmentAlerts(readings) {
    const alerts = [];
    
    if (readings.temperature > 30) {
        alerts.push({
            type: "HIGH_TEMPERATURE",
            severity: "high",
            message: "Temperature critically high",
            value: readings.temperature,
            recommendation: "Immediate cooling required"
        });
    } else if (readings.temperature > 28) {
        alerts.push({
            type: "HIGH_TEMPERATURE",
            severity: "medium",
            message: "Temperature above optimal range",
            value: readings.temperature,
            recommendation: "Increase ventilation or activate cooling system"
        });
    }
    
    if (readings.humidity > 80) {
        alerts.push({
            type: "HIGH_HUMIDITY",
            severity: "high",
            message: "Critically high humidity levels",
            value: readings.humidity,
            recommendation: "Immediate dehumidification required"
        });
    } else if (readings.humidity > 70) {
        alerts.push({
            type: "HIGH_HUMIDITY",
            severity: "medium", 
            message: "Humidity levels may affect material quality",
            value: readings.humidity,
            recommendation: "Consider using dehumidifier"
        });
    }
    
    if (readings.lightLevel < 200) {
        alerts.push({
            type: "LOW_LIGHT",
            severity: "medium",
            message: "Very low light levels detected",
            value: readings.lightLevel,
            recommendation: "Add supplementary lighting immediately"
        });
    } else if (readings.lightLevel < 300) {
        alerts.push({
            type: "LOW_LIGHT",
            severity: "low",
            message: "Insufficient lighting for detailed work",
            value: readings.lightLevel,
            recommendation: "Add task lighting"
        });
    }
    
    return alerts;
}

function calculateOptimalityScore(readings) {
    let score = 100;
    
    // Temperature scoring (optimal: 20-28°C)
    if (readings.temperature < 18 || readings.temperature > 30) {
        score -= 25;
    } else if (readings.temperature < 20 || readings.temperature > 28) {
        score -= 15;
    }
    
    // Humidity scoring (optimal: 40-65%)
    if (readings.humidity < 30 || readings.humidity > 80) {
        score -= 20;
    } else if (readings.humidity < 40 || readings.humidity > 70) {
        score -= 10;
    }
    
    // Light level scoring (optimal: >400 lux)
    if (readings.lightLevel < 200) {
        score -= 25;
    } else if (readings.lightLevel < 300) {
        score -= 15;
    } else if (readings.lightLevel < 400) {
        score -= 5;
    }
    
    // Air quality scoring (optimal: >80%)
    if (readings.airQuality && readings.airQuality < 60) {
        score -= 20;
    } else if (readings.airQuality && readings.airQuality < 80) {
        score -= 10;
    }
    
    return Math.max(score, 0);
}

function analyzeEnvironmentTrends(readings) {
    // Simple trend analysis for single reading
    return {
        temperature: {
            trend: "stable",
            change: "No significant change"
        },
        humidity: {
            trend: "stable", 
            change: "No significant change"
        },
        lightLevel: {
            trend: "stable",
            change: "No significant change"
        }
    };
}