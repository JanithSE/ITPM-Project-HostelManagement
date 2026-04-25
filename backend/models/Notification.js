import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['inquiry_reply', 'inquiry_new'],
      required: true,
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', index: true },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema, 'notifications')
