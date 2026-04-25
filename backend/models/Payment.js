/**
 * Mongoose model for hostel fee payments (student submission + admin review).
 * Enum strings must stay aligned with `paymentController` and frontend payment forms.
 */
import mongoose from 'mongoose'

const ROOM_TYPES = ['single', '2 person', '3 person']
const FACILITY_TYPES = ['fan', 'ac']
const TRANSACTION_TYPES = ['bank slip', 'online payment']

const paymentSchema = new mongoose.Schema(
  {
    /** Logged-in student account (exposed as `studentId` in API JSON) */
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true, trim: true },
    roomNo: { type: String, required: true, trim: true },
    month: { type: String, required: true, trim: true },
    roomType: { type: String, required: true, enum: ROOM_TYPES },
    facilityType: { type: String, required: true, enum: FACILITY_TYPES },
    amount: { type: Number, required: true },
    transactionType: { type: String, required: true, enum: TRANSACTION_TYPES },
    /** Stored file path e.g. /uploads/payments/xxx.pdf */
    proofFile: { type: String, trim: true },
    /** @deprecated use proofFile */
    proofUrl: { type: String, trim: true },
    /** @deprecated */
    transactionReference: { type: String, trim: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected', 'paid', 'failed'],
      default: 'pending',
    },
    adminRemarks: { type: String, trim: true },
  },
  { timestamps: true }
)

export const PAYMENT_ROOM_TYPES = ROOM_TYPES
export const PAYMENT_FACILITY_TYPES = FACILITY_TYPES
export const PAYMENT_TRANSACTION_TYPES = TRANSACTION_TYPES

export default mongoose.model('Payment', paymentSchema)
