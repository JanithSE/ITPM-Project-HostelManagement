import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, trim: true, required: true },
    title: { type: String, trim: true, required: true },
    message: { type: String, trim: true, required: true, maxlength: 1000 },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    metadata: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export default mongoose.model('Notification', notificationSchema)
