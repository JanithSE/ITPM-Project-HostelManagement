import mongoose from 'mongoose'

const latePassSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    returnTime: { type: String, trim: true },
    reason: { type: String, trim: true },

    roomType: { type: String, trim: true },
    facilityType: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    status: {
      type: String,
      // Keep old statuses for backward compatibility with existing documents
      enum: ['pending', 'processing', 'completed', 'rejected', 'approved'],
      default: 'pending',
    },
    adminRemarks: { type: String, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('LatePass', latePassSchema)
