// controllers/inquiryController.js
import Inquiry from "../models/inquiry.js";

export async function createInquiry(req, res) {
    try {
        const inquiryData = req.body;
        
        // Generate inquiry ID
        const lastInquiry = await Inquiry.find().sort({ inquiryId: -1 }).limit(1);
        if (lastInquiry.length === 0) {
            inquiryData.inquiryId = "INQ0001";
        } else {
            const lastId = lastInquiry[0].inquiryId.replace("INQ", "");
            const newId = (parseInt(lastId) + 1).toString().padStart(4, "0");
            inquiryData.inquiryId = "INQ" + newId;
        }

        if (req.user) {
            inquiryData.customerId = req.user.customerId;
            inquiryData.customerName = `${req.user.firstName} ${req.user.lastName}`;
            inquiryData.email = req.user.email;
        }

        inquiryData.status = "open";
        inquiryData.priority = calculatePriority(inquiryData);

        const newInquiry = new Inquiry(inquiryData);
        await newInquiry.save();

        res.status(201).json({
            message: "Inquiry created successfully",
            inquiry: newInquiry
        });

    } catch (err) {
        console.error("Create inquiry error:", err);
        res.status(500).json({
            message: "Failed to create inquiry",
            error: err.message
        });
    }
}

export async function getInquiries(req, res) {
    try {
        let query = {};
        
        if (req.user.role === "customer") {
            query.customerId = req.user.customerId;
        } else if (req.user.role === "artisan") {
            query.artisanId = req.user.artisanId;
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const inquiries = await Inquiry.find(query)
            .sort({ priority: -1, createdAt: -1 });

        res.json({
            message: "Inquiries fetched successfully",
            inquiries: inquiries
        });

    } catch (err) {
        console.error("Get inquiries error:", err);
        res.status(500).json({
            message: "Failed to fetch inquiries",
            error: err.message
        });
    }
}

export async function getInquiry(req, res) {
    try {
        const { inquiryId } = req.params;
        
        const inquiry = await Inquiry.findOne({ inquiryId });
        
        if (!inquiry) {
            return res.status(404).json({
                message: "Inquiry not found"
            });
        }

        // Check access permissions
        if (req.user.role === "customer" && inquiry.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.json({
            message: "Inquiry fetched successfully",
            inquiry: inquiry
        });

    } catch (err) {
        console.error("Get inquiry error:", err);
        res.status(500).json({
            message: "Failed to fetch inquiry",
            error: err.message
        });
    }
}

export async function updateInquiry(req, res) {
    try {
        const { inquiryId } = req.params;
        const updateData = req.body;

        const inquiry = await Inquiry.findOne({ inquiryId });
        if (!inquiry) {
            return res.status(404).json({
                message: "Inquiry not found"
            });
        }

        // Only inquiry owner or admin can update
        if (req.user.role === "customer" && inquiry.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Don't allow changing sensitive fields
        delete updateData.inquiryId;
        delete updateData.customerId;

        await Inquiry.findOneAndUpdate({ inquiryId }, updateData);

        res.json({
            message: "Inquiry updated successfully"
        });

    } catch (err) {
        console.error("Update inquiry error:", err);
        res.status(500).json({
            message: "Failed to update inquiry",
            error: err.message
        });
    }
}

export async function deleteInquiry(req, res) {
    try {
        const { inquiryId } = req.params;

        const inquiry = await Inquiry.findOne({ inquiryId });
        if (!inquiry) {
            return res.status(404).json({
                message: "Inquiry not found"
            });
        }

        // Only inquiry owner or admin can delete
        if (req.user.role === "customer" && inquiry.customerId !== req.user.customerId) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        await Inquiry.findOneAndDelete({ inquiryId });

        res.json({
            message: "Inquiry deleted successfully"
        });

    } catch (err) {
        console.error("Delete inquiry error:", err);
        res.status(500).json({
            message: "Failed to delete inquiry",
            error: err.message
        });
    }
}

export async function respondToInquiry(req, res) {
    try {
        if (req.user.role !== "admin" && req.user.role !== "artisan") {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const { inquiryId } = req.params;
        const { response } = req.body;

        await Inquiry.findOneAndUpdate(
            { inquiryId },
            {
                response: response,
                status: "responded",
                respondedAt: new Date(),
                respondedBy: req.user.role === "admin" ? "Admin" : req.user.businessName || req.user.companyName
            }
        );

        res.json({
            message: "Response sent successfully"
        });

    } catch (err) {
        console.error("Respond to inquiry error:", err);
        res.status(500).json({
            message: "Failed to send response",
            error: err.message
        });
    }
}

function calculatePriority(inquiryData) {
    let priority = 1; // Default: Low
    
    if (inquiryData.type === "complaint") priority = 3; // High
    else if (inquiryData.type === "technical") priority = 2; // Medium
    else if (inquiryData.type === "general") priority = 1; // Low
    
    if (inquiryData.subject && inquiryData.subject.toLowerCase().includes("urgent")) {
        priority = 3;
    }
    
    return priority;
}