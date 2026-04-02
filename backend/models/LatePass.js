import mongoose from 'mongoose'

const studentRowSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true },
    roomNo: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const latePassSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** @deprecated legacy single-student submissions */
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true },
    arrivingTime: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    guardianContactNo: { type: String, required: true, trim: true },
    documentFile: { type: String, trim: true },
    students: { type: [studentRowSchema], default: [], validate: [(v) => v.length >= 1, 'At least one student'] },

    /** @deprecated */
    returnTime: { type: String, trim: true },
    roomType: { type: String, trim: true },
    facilityType: { type: String, trim: true },
    transactionReference: { type: String, trim: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected', 'approved'],
      default: 'pending',
    },
    adminRemarks: { type: String, trim: true },
    /** Set when an admin updates status/remarks */
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.model('LatePass', latePassSchema)
