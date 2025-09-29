import express from "express";
import {
  approveItem,
  createCollection,
  deleteCollection,
  getAll,
  getOne,
  getRestaurantCollection,
  updateCollection,
} from "../controllers/collectionController.js";

const collectionRoute = express.Router();

collectionRoute.post("/", createCollection);
collectionRoute.get("/getAll/:id", getRestaurantCollection);
collectionRoute.put("/update/:id", updateCollection);
collectionRoute.delete("/delete/:id", deleteCollection);
collectionRoute.get("/", getAll);
collectionRoute.post("/isApprove/:id", approveItem);
collectionRoute.get("/getOne/:id", getOne);

export default collectionRoute;
