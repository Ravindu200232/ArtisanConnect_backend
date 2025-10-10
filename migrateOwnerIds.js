import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const OwnerSchema = new mongoose.Schema({
  ownerId: mongoose.Schema.Types.Mixed, // Allow both String and ObjectId temporarily
  ownerName: String,
  name: String,
  address: String,
  phone: String,
  images: [String],
  description: String,
  isOpen: Boolean,
  verified: Boolean,
});

const Owner = mongoose.model("owner", OwnerSchema);

async function migrateOwnerIds() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected!");

    const shops = await Owner.find({});
    console.log(`Found ${shops.length} shops`);

    let updated = 0;

    for (const shop of shops) {
      // Check if ownerId is a string
      if (typeof shop.ownerId === 'string') {
        try {
          // Convert string to ObjectId
          const objectId = new mongoose.Types.ObjectId(shop.ownerId);
          
          // Update the document
          await Owner.updateOne(
            { _id: shop._id },
            { $set: { ownerId: objectId } }
          );
          
          console.log(`✅ Updated shop: ${shop.name} (${shop._id})`);
          console.log(`   Old ownerId (string): ${shop.ownerId}`);
          console.log(`   New ownerId (ObjectId): ${objectId}`);
          updated++;
        } catch (err) {
          console.error(`❌ Failed to update shop ${shop.name}:`, err.message);
        }
      } else {
        console.log(`⏭️  Skipped shop: ${shop.name} (already ObjectId)`);
      }
    }

    console.log(`\n✅ Migration completed! Updated ${updated} shops.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateOwnerIds();