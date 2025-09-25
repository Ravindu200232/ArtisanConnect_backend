// routes/iotRouter.js
import express from "express";
import {
    registerIoTDevice,
    updateDeviceStatus,
    getDeviceData,
    getAllDevices,
    processEnvironmentData,
    getInventoryStatus,
    generateProductionReport
} from "../controllers/iotController.js";

const iotRouter = express.Router();

// Device management
iotRouter.post("/devices/register", registerIoTDevice);
iotRouter.put("/devices/:deviceId/status", updateDeviceStatus);
iotRouter.get("/devices/:deviceId/data", getDeviceData);
iotRouter.get("/devices", getAllDevices);

// Data processing
iotRouter.post("/environment", processEnvironmentData);
iotRouter.get("/inventory/:artisanId", getInventoryStatus);
iotRouter.get("/production-report/:artisanId", generateProductionReport);

export default iotRouter;
