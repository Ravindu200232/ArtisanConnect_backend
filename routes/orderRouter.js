// routes/orderRouter.js
import express from "express";
import {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    deleteOrder,
    getOrderAnalytics
} from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getOrders);
orderRouter.get("/:orderId", getOrder);
orderRouter.put("/:orderId/status", updateOrderStatus);
orderRouter.delete("/:orderId", deleteOrder);
orderRouter.get("/analytics/summary", getOrderAnalytics);

export default orderRouter;