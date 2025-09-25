// routes/tourismRouter.js
import express from "express";
import {
    createTourismPackage,
    getAllTourismPackages,
    getTourismPackage,
    updateTourismPackage,
    deleteTourismPackage,
    bookTourismPackage,
    getBookings,
    generateVRContent,
    getGPSCulturePoints,
    personalizeExperience
} from "../controllers/tourismController.js";

const tourismRouter = express.Router();

// Package management
tourismRouter.post("/packages", createTourismPackage);
tourismRouter.get("/packages", getAllTourismPackages);
tourismRouter.get("/packages/:packageId", getTourismPackage);
tourismRouter.put("/packages/:packageId", updateTourismPackage);
tourismRouter.delete("/packages/:packageId", deleteTourismPackage);

// Booking management
tourismRouter.post("/bookings", bookTourismPackage);
tourismRouter.get("/bookings", getBookings);

// AI & VR Features
tourismRouter.post("/vr-content", generateVRContent);
tourismRouter.get("/gps-culture/:latitude/:longitude", getGPSCulturePoints);
tourismRouter.post("/personalize", personalizeExperience);

export default tourismRouter;