// controllers/orderController.js
import Order from "../models/order.js";
import { Product } from "../models/product.js";
import { Customer } from "../models/customer.js";
import Artisan from "../models/artisan.js";

export async function createOrder(req, res) {
    try {
        const orderData = req.body;
        const customerId = req.user.customerId;

        if (!customerId) {
            return res.status(401).json({
                message: "Please login as customer"
            });
        }

        // Generate order ID
        const lastOrder = await Order.find().sort({ orderId: -1 }).limit(1);
        if (lastOrder.length === 0) {
            orderData.orderId = "ORD0001";
        } else {
            const lastId = lastOrder[0].orderId.replace("ORD", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            orderData.orderId = "ORD" + newId;
        }

        orderData.customerId = customerId;
        orderData.status = "pending";
        
        // Calculate total and validate products
        let totalAmount = 0;
        const orderItems = [];

        for (let item of orderData.items) {
            const product = await Product.findOne({ productId: item.productId });
            
            if (!product) {
                return res.status(404).json({
                    message: `Product ${item.productId} not found`
                });
            }

            if (!product.availability || product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Product ${product.name} is not available in requested quantity`
                });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                productId: item.productId,
                artisanId: product.artisanId,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: product.price,
                totalPrice: itemTotal,
                customizations: item.customizations || []
            });

            // Update product stock
            await Product.findOneAndUpdate(
                { productId: item.productId },
                { $inc: { stock: -item.quantity, totalSales: item.quantity } }
            );
        }

        orderData.items = orderItems;
        orderData.totalAmount = totalAmount;
        orderData.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const newOrder = new Order(orderData);
        await newOrder.save();

        // Update customer order count
        await Customer.findOneAndUpdate(
            { customerId },
            { 
                $inc: { totalOrders: 1, totalSpent: totalAmount },
                $push: { "aiProfile.purchasePatterns": {
                    categories: [...new Set(orderItems.map(item => item.category))],
                    totalAmount: totalAmount,
                    date: new Date()
                }}
            }
        );

        res.status(201).json({
            message: "Order created successfully",
            order: newOrder
        });

    } catch (err) {
        console.error("Create order error:", err);
        res.status(500).json({
            message: "Failed to create order",
            error: err.message
        });
    }
}

export async function getOrders(req, res) {
    try {
        let query = {};
        
        if (req.user.role === "customer") {
            query.customerId = req.user.customerId;
        } else if (req.user.role === "artisan") {
            query["items.artisanId"] = req.user.artisanId;
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('customerId', 'firstName lastName email');

        res.json({
            message: "Orders fetched successfully",
            orders: orders
        });

    } catch (err) {
        console.error("Get orders error:", err);
        res.status(500).json({
            message: "Failed to fetch orders",
            error: err.message
        });
    }
}

export async function getOrder(req, res) {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findOne({ orderId })
            .populate('customerId', 'firstName lastName email phone addresses');

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        // Check access permissions
        if (req.user.role === "customer" && order.customerId.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (req.user.role === "artisan") {
            const hasArtisanItems = order.items.some(item => item.artisanId === req.user.artisanId);
            if (!hasArtisanItems) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }
        }

        res.json({
            message: "Order fetched successfully",
            order: order
        });

    } catch (err) {
        console.error("Get order error:", err);
        res.status(500).json({
            message: "Failed to fetch order",
            error: err.message
        });
    }
}

export async function updateOrderStatus(req, res) {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber, notes } = req.body;

        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        // Only artisans and admins can update status
        if (req.user.role === "artisan") {
            const hasArtisanItems = order.items.some(item => item.artisanId === req.user.artisanId);
            if (!hasArtisanItems) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const updateData = { status };
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (notes) updateData.notes = notes;
        
        if (status === "shipped") {
            updateData.shippedDate = new Date();
        } else if (status === "delivered") {
            updateData.deliveredDate = new Date();
        }

        await Order.findOneAndUpdate({ orderId }, updateData);

        res.json({
            message: "Order status updated successfully"
        });

    } catch (err) {
        console.error("Update order error:", err);
        res.status(500).json({
            message: "Failed to update order",
            error: err.message
        });
    }
}

export async function deleteOrder(req, res) {
    try {
        const { orderId } = req.params;
        
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        await Order.findOneAndDelete({ orderId });

        res.json({
            message: "Order deleted successfully"
        });

    } catch (err) {
        console.error("Delete order error:", err);
        res.status(500).json({
            message: "Failed to delete order",
            error: err.message
        });
    }
}

export async function getOrderAnalytics(req, res) {
    try {
        if (req.user.role !== "admin" && req.user.role !== "artisan") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        let matchStage = {};
        if (req.user.role === "artisan") {
            matchStage["items.artisanId"] = req.user.artisanId;
        }

        const analytics = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                    averageOrderValue: { $avg: "$totalAmount" },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                    },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                    }
                }
            }
        ]);

        const monthlyStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        res.json({
            message: "Analytics fetched successfully",
            analytics: analytics[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                averageOrderValue: 0,
                pendingOrders: 0,
                completedOrders: 0
            },
            monthlyStats: monthlyStats
        });

    } catch (err) {
        console.error("Get analytics error:", err);
        res.status(500).json({
            message: "Failed to fetch analytics",
            error: err.message
        });
    }
}



