import mongoose from 'mongoose'

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://hosteladmin:1234@cluster0.ykd60i8.mongodb.net/unihostel'
    await mongoose.connect(uri)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}
