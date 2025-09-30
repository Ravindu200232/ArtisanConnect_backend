import express from 'express'
import { createOwner, deleteOwner, getOne, getOwner, updateOwner, verification } from '../controllers/ownerControlle.js';

const shopRoute = express.Router();

shopRoute.post("/",createOwner);
shopRoute.get("/",getOwner)
shopRoute.put("/update/:id",updateOwner);
shopRoute.delete("/delete/:id",deleteOwner);
shopRoute.post("/isVerify/:id",verification)
shopRoute.get("/getOne/:id",getOne);


export default shopRoute