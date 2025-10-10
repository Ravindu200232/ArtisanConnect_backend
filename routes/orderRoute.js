import express from "express"
import { addOrder, deleteOrder, getCustomerOrder, getOrder, getQuote, isApprove, updateStatus } from "../controllers/orderController.js";

const orderRoute = express.Router();

orderRoute.post("/",addOrder);
orderRoute.get("/",getOrder)
orderRoute.delete("/delete/:id",deleteOrder)
orderRoute.post("/quote",getQuote)
orderRoute.put("/status/:id",updateStatus)
orderRoute.put("/isApprove/:id",isApprove)
orderRoute.get("/customer",getCustomerOrder)


export default orderRoute