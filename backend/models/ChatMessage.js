import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, trim: true, required: true, maxlength: 4000 },
    source: { type: String, enum: ['rules', 'llm', 'system'], default: 'system' },
    intent: { type: String, trim: true, default: 'unknown' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

chatMessageSchema.index({ conversation: 1, createdAt: 1 })

export default mongoose.model('ChatMessage', chatMessageSchema)
