import Message from "../models/messageModel.js";
import Shop from "../models/owner.js";
import User from "../models/users.js";
import mongoose from "mongoose";

// ==================== SEND MESSAGE ====================
export const sendMessage = async (req, res) => {
  try {
    const { shopId, receiverId, message } = req.body;
    const senderId = req.user.id;

    if (!shopId || !message) {
      return res.status(400).json({
        message: "Shop ID and message are required",
      });
    }

    // Verify shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Get sender info
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Determine receiver based on sender role
    let actualReceiverId = receiverId;
    if (!receiverId) {
      if (sender.role === "customer") {
        // Customer is sending to shop owner
        actualReceiverId = shop.ownerId;
      } else if (sender.role === "artisan" || sender.role === "supplier") {
        // Shop owner is replying - need to get customer from context
        const lastMessage = await Message.findOne({ shopId }).sort({
          createdAt: -1,
        });
        if (lastMessage) {
          actualReceiverId =
            lastMessage.senderId.toString() === senderId
              ? lastMessage.receiverId.toString()
              : lastMessage.senderId.toString();
        }
      }
    }

    if (!actualReceiverId) {
      return res
        .status(400)
        .json({ message: "Receiver could not be determined" });
    }

    const receiver = await User.findById(actualReceiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Create new message with ObjectIds
    const newMessage = new Message({
      shopId: new mongoose.Types.ObjectId(shopId),
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(actualReceiverId),
      senderType: sender.role,
      receiverType: receiver.role,
      message: message.trim(),
    });

    await newMessage.save();

    // Populate and return
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "firstName lastName email image role")
      .populate("receiverId", "firstName lastName email image role");

    // Transform for frontend
    const transformedMessage = {
      _id: populatedMessage._id,
      message: populatedMessage.message,
      createdAt: populatedMessage.createdAt,
      isRead: populatedMessage.isRead,
      sender: {
        _id: populatedMessage.senderId._id,
        name: `${populatedMessage.senderId.firstName} ${populatedMessage.senderId.lastName}`,
        type: populatedMessage.senderId.role,
        image: populatedMessage.senderId.image,
      },
      receiver: {
        _id: populatedMessage.receiverId._id,
        name: `${populatedMessage.receiverId.firstName} ${populatedMessage.receiverId.lastName}`,
        type: populatedMessage.receiverId.role,
        image: populatedMessage.receiverId.image,
      },
      isOwnMessage: populatedMessage.senderId._id.toString() === senderId,
      displaySide:
        populatedMessage.senderId._id.toString() === senderId
          ? "right"
          : "left",
    };

    console.log("Message sent successfully:", transformedMessage._id);
    res.status(201).json(transformedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// ==================== GET CONVERSATION (For both Shop Owner and Customer) ====================
export const getConversation = async (req, res) => {
  try {
    const { shopId, customerId } = req.params;
    const userId = await Shop.findById(shopId).then((shop) =>
      shop ? shop.ownerId : null
    );

    console.log("=== GET CONVERSATION DEBUG ===");
    console.log("Shop ID:", shopId);
    console.log("Customer ID:", customerId);
    console.log("Current User ID:", userId);

    // Convert to ObjectIds
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    console.log("Converted ObjectIds:", {
      shopObjectId,
      customerObjectId,
      userObjectId,
    });

    // Find messages between the customer and shop owner
    const messages = await Message.find({
      shopId: shopObjectId,
      $or: [
        { senderId: customerObjectId, receiverId: userObjectId },
        { senderId: userObjectId, receiverId: customerObjectId },
      ],
    })
      .populate("senderId", "firstName lastName email image role")
      .populate("receiverId", "firstName lastName email image role")
      .sort({ createdAt: 1 });

    console.log("Messages found:", messages.length);

    // Mark received messages as read
    await Message.updateMany(
      {
        shopId: shopObjectId,
        senderId: customerObjectId,
        receiverId: userObjectId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Transform messages for frontend
    const transformedMessages = messages.map((message) => {
      const senderId = message.senderId._id.toString();
      const isOwnMessage = senderId === userId;

      return {
        _id: message._id,
        message: message.message,
        createdAt: message.createdAt,
        isRead: message.isRead,
        sender: {
          _id: message.senderId._id,
          name: `${message.senderId.firstName} ${message.senderId.lastName}`,
          type: message.senderId.role,
          image: message.senderId.image,
        },
        receiver: {
          _id: message.receiverId._id,
          name: `${message.receiverId.firstName} ${message.receiverId.lastName}`,
          type: message.receiverId.role,
          image: message.receiverId.image,
        },
        isOwnMessage: isOwnMessage,
        displaySide: isOwnMessage ? "right" : "left",
      };
    });

    // Get shop details
    const shop = await Shop.findById(shopObjectId).select(
      "name images ownerId ownerName description address phone"
    );

    console.log("Shop found:", shop ? shop.name : "null");
    console.log("Transformed messages:", transformedMessages.length);

    res.status(200).json({
      messages: transformedMessages,
      shop: shop,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({
      message: "Failed to fetch conversation",
      error: error.message,
    });
  }
};

// ==================== GET SHOP OWNER CONVERSATIONS ====================
export const getShopOwnerConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("=== SHOP OWNER CONVERSATIONS DEBUG ===");
    console.log("Fetching conversations for shop owner:", userId);

    // Get shops owned by this user
    let shops = await Shop.find({ ownerId: userId });

    // If not found and userId is string, try converting to ObjectId
    if (shops.length === 0 && typeof userId === "string") {
      try {
        const userObjId = new mongoose.Types.ObjectId(userId);
        shops = await Shop.find({ ownerId: userObjId });
      } catch (e) {
        console.log("Could not convert userId to ObjectId");
      }
    }

    console.log("Owned shops:", shops.length);

    if (shops.length === 0) {
      console.log("No shops found for this user");
      return res.status(200).json([]);
    }

    const shopIds = shops.map((shop) => shop._id);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get all messages for these shops involving this user
    const messages = await Message.find({
      shopId: { $in: shopIds },
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .populate("senderId", "firstName lastName email image role")
      .populate("receiverId", "firstName lastName email image role")
      .populate("shopId", "name images")
      .sort({ createdAt: -1 });

    console.log("Found messages:", messages.length);

    // Group messages by shop and other user (customer)
    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const senderId = msg.senderId?._id
        ? msg.senderId._id.toString()
        : msg.senderId.toString();
      const receiverId = msg.receiverId?._id
        ? msg.receiverId._id.toString()
        : msg.receiverId.toString();

      const isOwnerSender = senderId === userId;
      const otherUser = isOwnerSender ? msg.receiverId : msg.senderId;
      const otherUserId = isOwnerSender ? receiverId : senderId;

      const shopIdStr = msg.shopId?._id
        ? msg.shopId._id.toString()
        : msg.shopId.toString();
      const key = `${shopIdStr}-${otherUserId}`;

      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          _id: {
            shopId: msg.shopId?._id || msg.shopId,
            senderId: otherUser._id || otherUser,
          },
          sender: {
            _id: otherUser._id || otherUser,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.email,
            image: otherUser.image,
            role: otherUser.role,
          },
          shop: {
            _id: msg.shopId?._id || msg.shopId,
            name: msg.shopId?.name || "Unknown Shop",
            images: msg.shopId?.images || [],
          },
          lastMessage: {
            _id: msg._id,
            message: msg.message,
            createdAt: msg.createdAt,
            senderId: msg.senderId?._id || msg.senderId,
            senderType: msg.senderType,
          },
          unreadCount: 0,
          totalMessages: 0,
        });
      }

      const conv = conversationsMap.get(key);
      conv.totalMessages++;

      if (!msg.isRead && receiverId === userId) {
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log("Grouped conversations:", conversations.length);
    console.log("=== SHOP OWNER DEBUG END ===");

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching shop owner conversations:", error);
    res.status(500).json({
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

// ==================== GET CUSTOMER CONVERSATIONS ====================
export const getCustomerConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("=== CUSTOMER CONVERSATIONS DEBUG ===");
    console.log("Fetching conversations for customer:", userId);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get all messages involving this customer
    const messages = await Message.find({
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .populate("senderId", "firstName lastName email image role")
      .populate("receiverId", "firstName lastName email image role")
      .populate("shopId", "name images ownerId ownerName")
      .sort({ createdAt: -1 });

    console.log("Found messages for customer:", messages.length);

    if (messages.length === 0) {
      console.log("No messages found for this customer");
      return res.status(200).json([]);
    }

    // Group messages by shop
    const conversationsMap = new Map();

    for (const msg of messages) {
      const shopIdStr = msg.shopId?._id?.toString() ?? msg.shopId?.toString() ?? null;

      if (!conversationsMap.has(shopIdStr)) {
        // Get shop owner details
        let owner = null;
        if (msg.shopId?.ownerId) {
          try {
            owner = await User.findById(msg.shopId.ownerId);
          } catch (err) {
            console.log("Could not fetch owner for shop:", shopIdStr);
          }
        }

        conversationsMap.set(shopIdStr, {
          shopId: msg.shopId?._id || msg.shopId,
          shop: {
            _id: msg.shopId?._id || msg.shopId,
            name: msg.shopId?.name || "Unknown Shop",
            images: msg.shopId?.images || [],
            ownerName:
              msg.shopId?.ownerName ||
              (owner ? `${owner.firstName} ${owner.lastName}` : "Shop Owner"),
          },
          owner: owner
            ? {
                _id: owner._id,
                firstName: owner.firstName,
                lastName: owner.lastName,
                email: owner.email,
                image: owner.image,
                role: owner.role,
              }
            : null,
          lastMessage: {
            _id: msg._id,
            message: msg.message,
            createdAt: msg.createdAt,
            senderId: msg.senderId?._id || msg.senderId,
            senderType: msg.senderType,
          },
          unreadCount: 0,
          totalMessages: 0,
        });
      }

      const conv = conversationsMap.get(shopIdStr);
      conv.totalMessages++;

      const receiverId = msg.receiverId?._id
        ? msg.receiverId._id.toString()
        : msg.receiverId.toString();
      if (!msg.isRead && receiverId === userId) {
        conv.unreadCount++;
      }
    }

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log("Grouped conversations for customer:", conversations.length);
    console.log("=== CUSTOMER DEBUG END ===");

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching customer conversations:", error);
    res.status(500).json({
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

// ==================== GET UNREAD COUNT ====================
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId } = req.params;

    let filter = {
      receiverId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    };

    if (shopId) {
      filter.shopId = new mongoose.Types.ObjectId(shopId);
    }

    const count = await Message.countDocuments(filter);

    console.log(`Unread count for user ${userId}:`, count);
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
};

// ==================== DELETE MESSAGE ====================
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({
      _id: messageId,
      senderId: new mongoose.Types.ObjectId(userId),
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found or you don't have permission to delete it",
      });
    }

    await Message.findByIdAndDelete(messageId);

    console.log(`Message ${messageId} deleted by user ${userId}`);
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

// ==================== MARK MESSAGES AS READ ====================
export const markAsRead = async (req, res) => {
  try {
    const { shopId, senderId } = req.body;
    const userId = req.user.id;

    const result = await Message.updateMany(
      {
        shopId: new mongoose.Types.ObjectId(shopId),
        senderId: new mongoose.Types.ObjectId(senderId),
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    console.log(`Marked ${result.modifiedCount} messages as read`);
    res.status(200).json({
      message: "Messages marked as read",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};
