import mongoose from 'mongoose'

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.model('MaintenanceRequest', maintenanceSchema)
