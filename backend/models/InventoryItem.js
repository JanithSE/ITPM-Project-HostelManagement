import mongoose from 'mongoose'

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0 },
    location: { type: String, trim: true },
    category: { type: String, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('InventoryItem', inventoryItemSchema)
