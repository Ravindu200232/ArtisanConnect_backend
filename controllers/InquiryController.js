import Inquiry from "../models/inquiry.js";
import { checkAdmin, checkCustomer } from "./authController.js";

export async function addInquiry(req, res) {
    try {
        if (req.user == null) {
            res.status(401).json({
                message: "Please login and try again"
            });
            return;
        }

        const data = req.body;
        
        data.email = req.user.email;
        data.phone = req.user.phone;

        // Generate unique inquiryId
        let inquiryId = 1;

        const lastInquiry = await Inquiry.findOne().sort({ inquiryId: -1 }).limit(1);

        if (lastInquiry && lastInquiry.inquiryId) {
            inquiryId = lastInquiry.inquiryId + 1;
        }

        data.inquiryId = inquiryId;

        const newInquiry = new Inquiry(data);
        await newInquiry.save();

        res.json({
            message: "Inquiry added successfully",
            inquiry: newInquiry
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Inquiry added unsuccessfully",
            error: err.message
        });
    }
}

export async function getInquiry(req, res) {
    try {
        if (checkAdmin(req)) {
            const inquiries = await Inquiry.find().sort({ inquiryId: -1 });
            res.json(inquiries);
            return;
        }
        
        if (checkCustomer(req)) {
            const email = req.user.email;
            const inquiries = await Inquiry.find({ email: email }).sort({ inquiryId: -1 });
            res.json(inquiries);
            return;
        }
        
        res.status(403).json({
            message: "You are not authorized to perform this action"
        });
        
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Can't show details",
            error: err.message
        });
    }
}

export async function deleteInquiry(req, res) {
    try {
        const id = req.params.id;

        if (checkAdmin(req)) {
            const result = await Inquiry.deleteOne({ _id: id });
            
            if (result.deletedCount === 0) {
                res.status(404).json({
                    message: "Inquiry not found"
                });
                return;
            }
            
            res.json({
                message: "Inquiry deleted successfully"
            });
            return;
        }
        
        if (checkCustomer(req)) {
            const inquiry = await Inquiry.findOne({ _id: id });
            
            if (inquiry == null) {
                res.status(404).json({
                    message: "Inquiry not found"
                });
                return;
            }
            
            if (inquiry.email !== req.user.email) {
                res.status(403).json({
                    message: "You are not authorized to perform this action"
                });
                return;
            }
            
            await Inquiry.deleteOne({ _id: id });
            res.json({
                message: "Inquiry deleted successfully"
            });
            return;
        }
        
        res.status(403).json({
            message: "You are not authorized to perform this action"
        });
        
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Failed to delete inquiry",
            error: err.message
        });
    }
}

export async function updateInquiry(req, res) {
    try {
        const data = req.body;
        const id = req.params.id;

        // Check if inquiry exists
        const inquiry = await Inquiry.findOne({ _id: id });
        
        if (!inquiry) {
            res.status(404).json({
                message: "Inquiry not found"
            });
            return;
        }

        if (checkAdmin(req)) {
            await Inquiry.updateOne({ _id: id }, data);
            res.json({
                message: "Inquiry updated successfully"
            });
            return;
        }
        
        if (checkCustomer(req)) {
            if (inquiry.email !== req.user.email) {
                res.status(403).json({
                    message: "You are not authorized to perform this action"
                });
                return;
            }
            
            // Customers can only update message
            await Inquiry.updateOne({ _id: id }, { message: data.message });
            res.json({
                message: "Inquiry updated successfully"
            });
            return;
        }
        
        res.status(403).json({
            message: "You are not authorized to perform this action"
        });
        
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Failed to update inquiry",
            error: err.message
        });
    }
}