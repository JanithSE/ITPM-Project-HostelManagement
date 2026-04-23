import mongoose from 'mongoose'

const paymentNotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, required: true, trim: true },
    roleTarget: {
      type: String,
      enum: ['ADMIN', 'WARDEN', 'STUDENT'],
      required: true,
      index: true,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    month: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'PAYMENT', enum: ['PAYMENT'], index: true },
  },
  { timestamps: true }
)

paymentNotificationSchema.index({ userId: 1, createdAt: -1 })
paymentNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export default mongoose.model('PaymentNotification', paymentNotificationSchema, 'paymentnotifications')
