// server.js - Updated with AI Image Generation and Message routes
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectToDatabase } from './DbConnection.js';
import userRoute from './routes/userRoute.js';
import jwt from "jsonwebtoken";
import cors from "cors";
import inquiryRouter from './routes/inquiryRouter.js';
import orderRoute from './routes/orderRoute.js';
import paymentRouter from './routes/paymentRoute.js';
import notificationRoute from './routes/notificationRoute.js';
import shopRoute from './routes/ownerRoute.js';
import collectionRoute from './routes/collectionRoute.js';
import reviewRouter from './routes/reviewRouter.js';
import driverRoute from './routes/driverRoute.js';
import deliveryRoute from './routes/deliveryRoute.js';
import messageRoute from './routes/messageRoute.js';
import imageGenerationRoute from './routes/imageGenerationRoute.js'; // Add AI image generation
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT Authentication Middleware
app.use((req, res, next) => {
    let token = req.header("Authorization");

    if (token != null) {
        token = token.replace("Bearer ", "");
        jwt.verify(token, process.env.SEKRET_KEY, (err, decoded) => {
            if (!err) {
                req.user = decoded;
            }
        });
    }
    next();
});

connectToDatabase();

// Routes
app.use("/api/v1/notification", notificationRoute);
app.use("/api/payment", paymentRouter);
app.use("/api/v1/users", userRoute);
app.use("/api/inquiry", inquiryRouter);
app.use("/api/v1/owner", shopRoute);
app.use("/api/v1/collection", collectionRoute);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/driver", driverRoute);
app.use("/api/v1/delivery", deliveryRoute);
app.use("/api/v1/messages", messageRoute);
app.use("/api/v1/ai-images", imageGenerationRoute); // AI Image Generation routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ArticleConnect API with AI Image Generation is running',
    services: {
      aiImageGeneration: 'active',
      shopManagement: 'active',
      messaging: 'active',
      payments: 'active'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ArticleConnect Server is running on port ${PORT}`);
    console.log(`📸 AI Image Generation: /api/v1/ai-images`);
    console.log(`🛍️ Shop Management: /api/v1/owner`);
    console.log(`💬 Messaging: /api/v1/messages`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});