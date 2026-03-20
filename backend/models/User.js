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
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('User', userSchema)
