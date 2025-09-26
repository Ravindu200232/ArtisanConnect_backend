// routes/customerRouter.js
import express from "express";
import {
    registerCustomer,
    loginCustomer,
    getPersonalizedRecommendations,
    updateCustomerPreferences,
    trackProductView
} from "../controllers/customerController.js";

const customerRouter = express.Router();

// Authentication
customerRouter.post("/register", registerCustomer);
customerRouter.post("/login", loginCustomer);

// AI-powered features
customerRouter.get("/recommendations", getPersonalizedRecommendations);
customerRouter.put("/preferences", updateCustomerPreferences);
customerRouter.post("/track-view", trackProductView);

export default customerRouter;