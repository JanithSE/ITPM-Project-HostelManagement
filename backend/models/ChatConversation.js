import mongoose from 'mongoose'

const chatConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, trim: true, default: 'booking', index: true },
    lastActivity: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

export default mongoose.model('ChatConversation', chatConversationSchema)
