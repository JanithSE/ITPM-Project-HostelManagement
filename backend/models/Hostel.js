import mongoose from 'mongoose'

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    amenities: { type: [String], default: [] },
    totalRooms: { type: Number, default: 0 },
    availableRooms: { type: Number, default: 0 },
    pricePerBed: { type: Number, default: 0 },
    /** Public URL path served from /uploads, e.g. /uploads/hostels/abc.jpg */
    imageUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Hostel', hostelSchema)
