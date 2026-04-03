import mongoose from 'mongoose'

const inquiryCommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['student', 'admin', 'warden'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
)

const inquirySchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campusId: { type: String, trim: true, uppercase: true, default: '' },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'replied', 'closed'], default: 'open' },
    reply: { type: String },
    repliedAt: { type: Date },
    comments: { type: [inquiryCommentSchema], default: [] },
  },
  { timestamps: true }
)

export default mongoose.model('Inquiry', inquirySchema)
