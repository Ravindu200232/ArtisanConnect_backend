import express from "express";
import { 
  sendMessage, 
  getConversation, 
  getShopOwnerConversations,
  getCustomerConversations,
  getUnreadCount, 
  deleteMessage,
  markAsRead
} from "../controllers/messageController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// ==================== MESSAGE OPERATIONS ====================
// Send a message
router.post("/send", authenticate, sendMessage);

// Delete a message
router.delete("/:messageId", authenticate, deleteMessage);

// Mark messages as read
router.post("/mark-read", authenticate, markAsRead);

// ==================== SHOP OWNER ROUTES ====================
// Get all conversations for shop owner (artisan/supplier)
router.get("/shop/conversations", authenticate, getShopOwnerConversations);

// Get specific conversation for shop owner
router.get("/shop/:shopId/customer/:customerId", authenticate, getConversation);

// ==================== CUSTOMER ROUTES ====================
// Get all conversations for customer
router.get("/customer/conversations", authenticate, getCustomerConversations);

// Get specific conversation for customer
router.get("/customer/:customerId/shop/:shopId", authenticate, getConversation);

// ==================== UTILITY ROUTES ====================
// Get unread count (optional shopId parameter)
router.get("/unread/:shopId?", authenticate, getUnreadCount);

export default router;