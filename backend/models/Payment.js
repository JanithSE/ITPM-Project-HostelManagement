import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.model('Payment', paymentSchema)
