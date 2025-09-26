// routes/supplierRouter.js
import express from "express";
import {
    registerSupplier,
    loginSupplier,
    getAllSuppliers,
    getSupplierProfile,
    updateSupplierProfile,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterials,
    processSupplyOrder,
    getSupplierAnalytics
} from "../controllers/supplierController.js";

const supplierRouter = express.Router();

// Authentication
supplierRouter.post("/register", registerSupplier);
supplierRouter.post("/login", loginSupplier);

// Profile management
supplierRouter.get("/", getAllSuppliers);
supplierRouter.get("/:supplierId", getSupplierProfile);
supplierRouter.put("/:supplierId", updateSupplierProfile);

// Material management
supplierRouter.post("/materials", addMaterial);
supplierRouter.put("/materials/:materialId", updateMaterial);
// supplierRouter.delete("/materials/:materialId", deleteMaterial);
supplierRouter.get("/materials", getMaterials);

// Order processing
supplierRouter.post("/orders", processSupplyOrder);

// Analytics
supplierRouter.get("/analytics", getSupplierAnalytics);

export default supplierRouter;