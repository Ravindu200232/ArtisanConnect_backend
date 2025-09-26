



// routes/paymentRouter.js
import express from "express";
import {
    processPayment,
    getPaymentStatus,
    getAllPayments,
    refundPayment,
    getPaymentAnalytics
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/process", processPayment);
paymentRouter.get("/:paymentId/status", getPaymentStatus);
paymentRouter.get("/", getAllPayments);
paymentRouter.post("/:paymentId/refund", refundPayment);
paymentRouter.get("/analytics/summary", getPaymentAnalytics);

export default paymentRouter;