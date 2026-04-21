import mongoose from 'mongoose'

const latePassNotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, required: true, trim: true },
    roleTarget: {
      type: String,
      enum: ['ADMIN', 'WARDEN', 'STUDENT'],
      required: true,
      index: true,
    },
    latePassId: { type: mongoose.Schema.Types.ObjectId, ref: 'LatePass', required: true, index: true },
    read: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'LATE_PASS', enum: ['LATE_PASS'], index: true },
  },
  { timestamps: true }
)

latePassNotificationSchema.index({ userId: 1, createdAt: -1 })
latePassNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export default mongoose.model('LatePassNotification', latePassNotificationSchema, 'latepassnotifications')
