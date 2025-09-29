import express from 'express'
import { createOwner, deleteOwner, getOne, getOwner, updateOwner, verification } from '../controllers/ownerControlle.js';

const restaurantRoute = express.Router();

restaurantRoute.post("/",createOwner);
restaurantRoute.get("/",getOwner)
restaurantRoute.put("/update/:id",updateOwner);
restaurantRoute.delete("/delete/:id",deleteOwner);
restaurantRoute.post("/isVerify/:id",verification)
restaurantRoute.get("/getOne/:id",getOne);


export default restaurantRoute