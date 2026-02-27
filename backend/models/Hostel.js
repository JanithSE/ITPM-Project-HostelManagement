import mongoose from 'mongoose'

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    totalRooms: { type: Number, default: 0 },
    availableRooms: { type: Number, default: 0 },
    pricePerBed: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Hostel', hostelSchema)
