// server.js - Updated with message routes

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
import messageRoute from './routes/messageRoute.js'; // Add this import

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

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
app.use("/api/v1/messages", messageRoute); // Add message route

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});