import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, trim: true },
    bedNumber: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    fromDate: { type: Date },
    toDate: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
