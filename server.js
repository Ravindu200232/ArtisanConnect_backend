import mongoose from "mongoose";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import artisanRoutes from "./routes/artisanRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import tourismRoutes from "./routes/tourismRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// Middleware imports
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth middleware (global)
app.use(authMiddleware);

// Database connection
const MONGOURL = process.env.MONGO_URL;

mongoose.connect(MONGOURL);

const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB Connection established successfully");
});

connection.on("error", (err) => {
    console.log("MongoDB connection error:", err);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/tourism", tourismRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "ArtisanConnect API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ArtisanConnect Server is running on port ${PORT}`);
});