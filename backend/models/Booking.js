import mongoose from 'mongoose'

const documentReviewSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'not_uploaded'], default: 'pending' },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, trim: true },
    bedNumber: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'cancelled'], default: 'pending' },
    note: { type: String, trim: true, maxlength: 500 },
    fromDate: { type: Date },
    toDate: { type: Date },
    studentName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    contactNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, trim: true, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    instituteName: { type: String, trim: true },
    courseProgram: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactNumber: { type: String, trim: true },
    roomType: { type: String, trim: true },
    occupantsCount: { type: Number, min: 1, max: 8 },
    specialRequests: { type: String, trim: true, maxlength: 1000 },
    documents: {
      nic: { type: String, trim: true },
      studentId: { type: String, trim: true },
      medicalReport: { type: String, trim: true },
      policeReport: { type: String, trim: true },
      guardianLetter: { type: String, trim: true },
      recommendationLetter: { type: String, trim: true },
    },
    documentReviews: {
      nic: { type: documentReviewSchema, default: () => ({ status: 'pending' }) },
      studentId: { type: documentReviewSchema, default: () => ({ status: 'pending' }) },
      medicalReport: { type: documentReviewSchema, default: () => ({ status: 'pending' }) },
      policeReport: { type: documentReviewSchema, default: () => ({ status: 'pending' }) },
      guardianLetter: { type: documentReviewSchema, default: () => ({ status: 'pending' }) },
      recommendationLetter: { type: documentReviewSchema, default: () => ({ status: 'not_uploaded' }) },
    },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
    missingDocuments: [{ type: String, trim: true }],
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
