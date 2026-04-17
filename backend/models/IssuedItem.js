import mongoose from 'mongoose'

const issuedLineSchema = new mongoose.Schema(
  {
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    category: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const issuedItemSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    /** Snapshot for reports if hostel is renamed */
    hostelName: { type: String, trim: true, default: '' },
    roomNumber: { type: String, trim: true, required: true },
    bedNumber: { type: String, trim: true, default: '' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, trim: true, required: true },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: { type: [issuedLineSchema], default: [] },
  },
  { timestamps: true },
)

issuedItemSchema.index({ hostel: 1, issuedAt: -1 })
issuedItemSchema.index({ student: 1, issuedAt: -1 })

export default mongoose.model('IssuedItem', issuedItemSchema)
