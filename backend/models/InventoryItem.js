import mongoose from 'mongoose'

const INVENTORY_CONDITIONS = ['good', 'used', 'time_to_reallocate']

const inventoryItemSchema = new mongoose.Schema(
  {
    /** Display label for this stock line (e.g. "Beds — all types"). */
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0 },
    location: { type: String, trim: true },
    /**
     * One category per document only; duplicated categories are not allowed across records.
     */
    category: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    condition: {
      type: String,
      enum: INVENTORY_CONDITIONS,
      default: 'good',
    },
    /** Units issued to each student when a booking is confirmed (0 = not auto-issued). */
    issuePerBooking: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

export default mongoose.model('InventoryItem', inventoryItemSchema)
