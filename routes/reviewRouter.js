import express from "express";
import { addReview, approveReview, deleteReview, disApproveReview, getReview } from "../controllers/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.post("/",addReview);

reviewRouter.get("/",getReview);

reviewRouter.delete("/delete/:id",deleteReview);

reviewRouter.put("/approve/:id",approveReview);

reviewRouter.get("/:key",disApproveReview)



export default reviewRouter;