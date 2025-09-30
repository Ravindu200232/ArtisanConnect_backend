import express from "express";
import { addInquiry, deleteInquiry, getInquiry, updateInquiry } from "../controllers/InquiryController.js";

const inquiryRouter = express.Router();

inquiryRouter.post("/",addInquiry)
inquiryRouter.get("/",getInquiry)
inquiryRouter.delete("/:id",deleteInquiry)
inquiryRouter.put("/:id",updateInquiry)

export  default inquiryRouter;