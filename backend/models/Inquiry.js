import mongoose from 'mongoose'

const inquirySchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'replied', 'closed'], default: 'open' },
    reply: { type: String },
    repliedAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.model('Inquiry', inquirySchema)
