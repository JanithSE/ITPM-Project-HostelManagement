import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'admin', 'warden'], required: true },
    phoneNumber: { type: String, trim: true, default: '' },
    nic: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gender: { type: String, trim: true, lowercase: true, default: '' },
    assignedHostel: { type: String, trim: true, default: '' },
    /** University / registration ID — used to match late-pass group requests */
    universityId: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: '' },
    otpExpiresAt: { type: Date, default: null },
    otpPurpose: { type: String, enum: ['', 'registration', 'password_reset'], default: '' },
<<<<<<< HEAD
    /** SHA-256 hash of one-time token issued after password-reset OTP verification */
    passwordResetTokenHash: { type: String, default: '' },
=======
    /** SHA-256 hash of the one-time reset token issued after OTP verification (password reset flow). */
    passwordResetTokenHash: { type: String, default: '' },
    /** Expiry time for the one-time reset token issued after OTP verification (password reset flow). */
>>>>>>> 5c4db82c7f27ea923132d576ce43a59c4a46d9dd
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = async function (candidate) {
  const hash = this.password
  if (hash == null || typeof hash !== 'string') return false
  try {
    return await bcrypt.compare(String(candidate), hash)
  } catch {
    return false
  }
}

export default mongoose.model('User', userSchema)
