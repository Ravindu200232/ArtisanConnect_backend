// routes/artisanRouter.js
import express from "express";
import {
    registerArtisan,
    loginArtisan,
    getAllArtisans,
    getArtisanProfile,
    updateArtisanProfile,
    analyzePhotoQuality,
    getBusinessInsights,
    toggleArtisanBlock
} from "../controllers/artisanController.js";

const artisanRouter = express.Router();

// Authentication routes
artisanRouter.post("/register", registerArtisan);
artisanRouter.post("/login", loginArtisan);

// Profile management
artisanRouter.get("/", getAllArtisans);
artisanRouter.get("/:artisanId", getArtisanProfile);
artisanRouter.put("/:artisanId", updateArtisanProfile);

// AI Features
artisanRouter.post("/ai/photo-analysis", analyzePhotoQuality);
artisanRouter.get("/ai/business-insights", getBusinessInsights);

// Admin functions
artisanRouter.put("/admin/block/:artisanId", toggleArtisanBlock);

export default artisanRouter;















