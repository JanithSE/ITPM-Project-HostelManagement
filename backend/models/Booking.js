import mongoose from 'mongoose'

const ROOM_TYPES = ['single', 'double']
const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, trim: true,unique: true,required: true },
    roomType: { type: String, enum: ROOM_TYPES, default: 'double',required: true },
    bedNumber: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    fromDate: { type: Date,required:true },
    toDate: { type: Date,required:true },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
