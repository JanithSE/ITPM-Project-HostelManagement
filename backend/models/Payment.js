import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Payment period (e.g., "2026-03" or "March 2026")
    month: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },

    roomNo: { type: String, trim: true },

    // Hostel-specific details (free-form strings)
    roomType: { type: String, trim: true },
    facilityType: { type: String, trim: true },

    transactionReference: { type: String, trim: true },

    // URL/path to uploaded proof file
    proofUrl: { type: String, trim: true },

    status: {
      type: String,
      // Keep old statuses for backward compatibility with existing documents
      enum: ['pending', 'processing', 'completed', 'rejected', 'paid', 'failed'],
      default: 'pending',
    },

    adminRemarks: { type: String, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('Payment', paymentSchema)
