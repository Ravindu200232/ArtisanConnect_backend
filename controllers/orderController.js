import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Artisan from "../models/Artisan.js";
import mongoose from "mongoose";

// Create Order
export const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            items,
            shippingAddress,
            billingAddress,
            payment,
            shipping,
            notes,
            discounts = []
        } = req.body;

        // Validate and process order items
        const processedItems = [];
        let subtotal = 0;

        for (let item of items) {
            const product = await Product.findById(item.product).session(session);
            
            if (!product) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    error: `Product not found: ${item.product}`,
                    code: "PRODUCT_NOT_FOUND"
                });
            }

            if (!product.isInStock(item.quantity)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock for product: ${product.name}`,
                    code: "INSUFFICIENT_STOCK",
                    availableQuantity: product.availableQuantity
                });
            }

            // Reserve inventory
            const reserved = await product.reserveInventory(item.quantity);
            if (!reserved) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    error: `Could not reserve inventory for: ${product.name}`,
                    code: "INVENTORY_RESERVATION_FAILED"
                });
            }

            // Calculate item price
            let unitPrice = product.pricing.discountedPrice || product.pricing.basePrice;
            let itemTotal = unitPrice * item.quantity;

            // Add customization costs
            let customizationCost = 0;
            if (item.customization && item.customization.isCustomized) {
                for (let customOption of item.customization.customOptions || []) {
                    customizationCost += customOption.additionalCost || 0;
                }
                itemTotal += customizationCost * item.quantity;
            }

            processedItems.push({
                product: product._id,
                artisan: product.artisan,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: itemTotal,
                customization: item.customization || { isCustomized: false }
            });

            subtotal += itemTotal;
        }

        // Calculate shipping cost
        let shippingCost = 0;
        if (shipping.method === "express") {
            shippingCost = 500; // Express shipping cost
        } else if (shipping.method === "international") {
            shippingCost = 2000; // International shipping cost
        } else {
            shippingCost = 200; // Standard shipping cost
        }

        // Calculate tax (if applicable)
        const taxAmount = 0; // Sri Lanka doesn't have VAT on handicrafts typically

        // Apply discounts
        let discountAmount = 0;
        for (let discount of discounts) {
            discountAmount += discount.amount;
        }

        // Calculate total amount
        const totalAmount = subtotal + shippingCost + taxAmount - discountAmount;

        // Create order
        const orderData = {
            customer: req.user._id,
            items: processedItems,
            pricing: {
                subtotal,
                shippingCost,
                taxAmount,
                discountAmount,
                totalAmount
            },
            discounts,
            shippingAddress,
            billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
            payment,
            shipping,
            notes: {
                customerNotes: notes?.customerNotes || ""
            }
        };

        const order = new Order(orderData);
        
        // Calculate estimated completion date
        await order.calculateEstimatedCompletion();
        
        // Add initial status to timeline
        order.addStatusUpdate("pending_payment", "Order created", req.user._id, "Customer");

        await order.save({ session });

        // Update customer statistics
        const customer = await Customer.findById(req.user._id);
        if (customer) {
            customer.addLoyaltyPoints(totalAmount);
            await customer.save({ session });
        }

        await session.commitTransaction();

        // Populate the saved order for response
        await order.populate([
            {
                path: "items.product",
                select: "name images pricing category"
            },
            {
                path: "items.artisan",
                select: "firstName lastName businessInfo.businessName"
            }
        ]);

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: {
                order
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Create order error:", error);

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
    } finally {
        session.endSession();
    }
};

// Get Customer Orders
export const getCustomerOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, sort = "-createdAt" } = req.query;

        // Build filter
        const filter = { customer: req.user._id };
        if (status) filter.status = status;

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const orders = await Order.find(filter)
            .populate([
                {
                    path: "items.product",
                    select: "name images pricing category"
                },
                {
                    path: "items.artisan",
                    select: "firstName lastName businessInfo.businessName"
                }
            ])
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalOrders,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get customer orders error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Artisan Orders
export const getArtisanOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, sort = "-createdAt" } = req.query;

        // Build filter for orders containing artisan's products
        const filter = { "items.artisan": req.user._id };
        if (status) filter.status = status;

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        let sortObject = {};
        if (sort.startsWith("-")) {
            sortObject[sort.substring(1)] = -1;
        } else {
            sortObject[sort] = 1;
        }

        const orders = await Order.find(filter)
            .populate([
                {
                    path: "customer",
                    select: "firstName lastName email phoneNumber"
                },
                {
                    path: "items.product",
                    select: "name images pricing category"
                }
            ])
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit));

        // Filter items to only show artisan's own products
        const filteredOrders = orders.map(order => ({
            ...order.toObject(),
            items: order.items.filter(item => 
                item.artisan.toString() === req.user._id.toString()
            )
        }));

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                orders: filteredOrders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalOrders,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Get artisan orders error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Get Order by ID
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid order ID",
                code: "INVALID_ID"
            });
        }

        let filter = { _id: id };

        // Check if user owns this order or has products in it
        if (req.user.userType === "customer") {
            filter.customer = req.user._id;
        } else if (req.user.userType === "artisan") {
            filter["items.artisan"] = req.user._id;
        } else if (req.user.userType !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                code: "ACCESS_DENIED"
            });
        }

        const order = await Order.findOne(filter)
            .populate([
                {
                    path: "customer",
                    select: "firstName lastName email phoneNumber"
                },
                {
                    path: "items.product",
                    select: "name images pricing category craftingDetails"
                },
                {
                    path: "items.artisan",
                    select: "firstName lastName businessInfo.businessName phoneNumber"
                }
            ]);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order not found",
                code: "ORDER_NOT_FOUND"
            });
        }

        // If artisan, filter items to only show their products
        if (req.user.userType === "artisan") {
            order.items = order.items.filter(item => 
                item.artisan._id.toString() === req.user._id.toString()
            );
        }

        res.status(200).json({
            success: true,
            data: {
                order
            }
        });

    } catch (error) {
        console.error("Get order by ID error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Update Order Status (Artisan can update item status)
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, itemId, note } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid order ID",
                code: "INVALID_ID"
            });
        }

        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order not found",
                code: "ORDER_NOT_FOUND"
            });
        }

        // If artisan is updating item status
        if (req.user.userType === "artisan" && itemId) {
            const item = order.items.id(itemId);
            
            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: "Order item not found",
                    code: "ITEM_NOT_FOUND"
                });
            }

            if (item.artisan.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    error: "You can only update your own items",
                    code: "ACCESS_DENIED"
                });
            }

            item.status = status;
            order.addStatusUpdate(`Item ${status}`, note || `Item ${item.product} status updated to ${status}`, req.user._id, "Artisan");

            // Check if all items are ready to update overall order status
            const allItemsReady = order.items.every(item => 
                item.status === "ready" || item.artisan.toString() !== req.user._id.toString()
            );

            if (allItemsReady && status === "ready") {
                order.status = "ready";
                order.addStatusUpdate("ready", "All items ready for shipping", req.user._id, "Artisan");
            }

        } else if (req.user.userType === "customer" || req.user.userType === "admin") {
            // Customer or admin updating overall order status
            if (req.user.userType === "customer" && order.customer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied",
                    code: "ACCESS_DENIED"
                });
            }

            order.addStatusUpdate(status, note, req.user._id, req.user.userType === "customer" ? "Customer" : "Admin");
        } else {
            return res.status(403).json({
                success: false,
                error: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS"
            });
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: {
                order
            }
        });

    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};

// Cancel Order
export const cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                error: "Invalid order ID",
                code: "INVALID_ID"
            });
        }

        const order = await Order.findById(id).session(session);
        
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: "Order not found",
                code: "ORDER_NOT_FOUND"
            });
        }

        // Check if user can cancel this order
        if (req.user.userType === "customer" && order.customer.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                error: "Access denied",
                code: "ACCESS_DENIED"
            });
        }

        // Check if order can be cancelled
        if (!order.canBeCancelled()) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                error: "Order cannot be cancelled at this stage",
                code: "CANNOT_CANCEL_ORDER",
                currentStatus: order.status
            });
        }

        // Release reserved inventory
        for (let item of order.items) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                await product.releaseReservedInventory(item.quantity);
            }
        }

        // Update cancellation details
        order.cancellation = {
            isCancelled: true,
            cancelledBy: req.user._id,
            cancelledByModel: req.user.userType === "customer" ? "Customer" : "Artisan",
            cancelledAt: new Date(),
            reason: reason || "Cancelled by customer",
            refundStatus: "pending"
        };

        order.addStatusUpdate("cancelled", reason || "Order cancelled", req.user._id, req.user.userType === "customer" ? "Customer" : "Artisan");

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: {
                order
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Cancel order error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    } finally {
        session.endSession();
    }
};

// Process Payment Update
export const updatePaymentStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { paymentStatus, transactionId, paymentDetails } = req.body;

        const order = await Order.findById(id).session(session);
        
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: "Order not found",
                code: "ORDER_NOT_FOUND"
            });
        }

        // Update payment information
        order.payment.status = paymentStatus;
        order.payment.transactionId = transactionId;
        order.payment.paymentDetails = paymentDetails;
        order.payment.paymentDate = new Date();

        // Update order status based on payment status
        if (paymentStatus === "completed") {
            order.addStatusUpdate("paid", "Payment completed successfully", req.user._id, "Customer");
            
            // Move reserved inventory to confirmed
            for (let item of order.items) {
                const product = await Product.findById(item.product).session(session);
                if (product) {
                    await product.completeSale(item.quantity);
                }
            }

            // Update customer statistics
            const customer = await Customer.findById(order.customer);
            if (customer) {
                await customer.updateStatistics();
            }

        } else if (paymentStatus === "failed") {
            order.addStatusUpdate("payment_failed", "Payment failed", req.user._id, "Customer");
            
            // Release reserved inventory
            for (let item of order.items) {
                const product = await Product.findById(item.product).session(session);
                if (product) {
                    await product.releaseReservedInventory(item.quantity);
                }
            }
        }

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: {
                order
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Update payment status error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    } finally {
        session.endSession();
    }
};

// Get Order Statistics (for dashboard)
export const getOrderStatistics = async (req, res) => {
    try {
        let matchCondition = {};

        if (req.user.userType === "customer") {
            matchCondition.customer = req.user._id;
        } else if (req.user.userType === "artisan") {
            matchCondition["items.artisan"] = req.user._id;
        }

        const stats = await Order.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$pricing.totalAmount" },
                    pendingOrders: {
                        $sum: { $cond: [{ $in: ["$status", ["pending_payment", "paid", "confirmed", "processing"]] }, 1, 0] }
                    },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
                    },
                    averageOrderValue: { $avg: "$pricing.totalAmount" }
                }
            }
        ]);

        const statistics = stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            averageOrderValue: 0
        };

        // Get monthly order trend (last 12 months)
        const monthlyTrend = await Order.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$pricing.totalAmount" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                statistics,
                monthlyTrend
            }
        });

    } catch (error) {
        console.error("Get order statistics error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "SERVER_ERROR"
        });
    }
};