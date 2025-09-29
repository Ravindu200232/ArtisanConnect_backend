import express from "express";
import { createDriver, deleteDriver, driverLogin, getDriver, updateDriver } from "../controllers/driverController.js";

const driverRoute = express.Router();


driverRoute.post("/login",driverLogin);
driverRoute.post("/",createDriver);
driverRoute.get("/",getDriver);
driverRoute.put("/:id",updateDriver);
driverRoute.delete("/:id",deleteDriver);

export default driverRoute

