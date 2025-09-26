// routes/aiRouter.js
import express from "express";
import {
    generateCulturalStory,
    translateContent,
    generateARVisualization,
    processIoTData
} from "../controllers/customerController.js";

const aiRouter = express.Router();

// AI Services
aiRouter.post("/cultural-story", generateCulturalStory);
aiRouter.post("/translate", translateContent);
aiRouter.post("/ar-visualization", generateARVisualization);
aiRouter.post("/iot-data", processIoTData);

export default aiRouter;