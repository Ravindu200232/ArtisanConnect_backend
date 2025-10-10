import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner', // Changed from 'Shop' to 'Owner'
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure unique conversation between users for a shop
conversationSchema.index({ participants: 1, shop: 1 }, { unique: true });

// Method to get other participant
conversationSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(participant => !participant.equals(userId));
};

export default mongoose.model("Conversation", conversationSchema);