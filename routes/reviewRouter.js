// routes/reviewRouter.js
import express from "express";
import {
    addReview,
    getReviews,
    updateReview,
    deleteReview,
    approveReview,
    getProductReviews
} from "../controllers/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.post("/", addReview);
reviewRouter.get("/", getReviews);
reviewRouter.get("/product/:productId", getProductReviews);
reviewRouter.put("/:reviewId", updateReview);
reviewRouter.delete("/:reviewId", deleteReview);
reviewRouter.put("/admin/approve/:reviewId", approveReview);

export default reviewRouter;
