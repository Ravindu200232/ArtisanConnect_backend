import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "owner",  // ✅ Changed from "Shop" to "owner"
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderType: {
    type: String,
    enum: ['customer', 'artisan', 'supplier', 'admin'],
    required: true,
  },
  receiverType: {
    type: String,
    enum: ['customer', 'artisan', 'supplier', 'admin'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);

export default Message;