// routes/inquiryRouter.js
import express from "express";
import {
    createInquiry,
    getInquiries,
    getInquiry,
    updateInquiry,
    deleteInquiry,
    respondToInquiry
} from "../controllers/inquiryController.js";

const inquiryRouter = express.Router();

inquiryRouter.post("/", createInquiry);
inquiryRouter.get("/", getInquiries);
inquiryRouter.get("/:inquiryId", getInquiry);
inquiryRouter.put("/:inquiryId", updateInquiry);
inquiryRouter.delete("/:inquiryId", deleteInquiry);
inquiryRouter.post("/:inquiryId/respond", respondToInquiry);

export default inquiryRouter;