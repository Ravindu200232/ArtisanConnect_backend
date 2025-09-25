import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

// Import routers
import artisanRouter from "./routes/artisanRouter.js";
import customerRouter from "./routes/customerRouter.js";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js";
import supplierRouter from "./routes/supplierRouter.js";
import tourismRouter from "./routes/tourismRouter.js";
import reviewRouter from "./routes/reviewRouter.js";
import inquiryRouter from "./routes/inquiryRouter.js";
import aiRouter from "./routes/aiRouter.js";
import blockchainRouter from "./routes/blockchainRouter.js";
import iotRouter from "./routes/iotRouter.js";
import paymentRouter from "./routes/paymentRouter.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// JWT Authentication Middleware
app.use((req, res, next) => {
    let token = req.header("Authorization");
    
    if (token != null) {
        token = token.replace("Bearer ", "");
        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
            if (!err) {
                req.user = decoded;
            }
        });
    }
    next();
});

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL);

const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB Connection established successfully");
});

// API Routes
app.use("/api/artisans", artisanRouter);
app.use("/api/customers", customerRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/tourism", tourismRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/inquiries", inquiryRouter);
app.use("/api/ai", aiRouter);
app.use("/api/blockchain", blockchainRouter);
app.use("/api/iot", iotRouter);
app.use("/api/payments", paymentRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ 
        message: "ArtisanConnect Backend is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ArtisanConnect Server is running on port ${PORT}`);
});