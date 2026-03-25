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
