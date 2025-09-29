import express from 'express'
import { addDelivery, getDelivery, getLocation, updateDeliveryLocation, updateDeliveryStatus } from '../controllers/deliverController.js';

const deliveryRoute = express.Router();

deliveryRoute.post("/",addDelivery);

deliveryRoute.get("/",getDelivery)

deliveryRoute.put("/location/:id",updateDeliveryLocation)

deliveryRoute.put("/update/:id",updateDeliveryStatus)

deliveryRoute.get("/loc/:id",getLocation)

export default deliveryRoute