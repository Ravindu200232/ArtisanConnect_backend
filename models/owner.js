import mongoose from "mongoose";

const OwnerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,  // ✅ Changed from String to ObjectId
    ref: "User",
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    required: true,
    default: [
      "https://www.pngall.com/wp-content/uploads/5/Restaurant-PNG-Image.png",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Owner = mongoose.model("owner", OwnerSchema);

export default Owner;