import 'dotenv/config'
import mongoose from 'mongoose'
import User from './models/User.js'
import Hostel from './models/Hostel.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unihostel'

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const existingAdmin = await User.findOne({ email: 'admin@unihostel.com' })
  if (!existingAdmin) {
    await User.create({
      name: 'Admin',
      email: 'admin@unihostel.com',
      password: 'admin123',
      role: 'admin',
    })
    console.log('Created admin: admin@unihostel.com / admin123')
  } else {
    console.log('Admin already exists')
  }

  const existingStudent = await User.findOne({ email: 'student@unihostel.com' })
  if (!existingStudent) {
    await User.create({
      name: 'Test Student',
      email: 'student@unihostel.com',
      password: 'student123',
      role: 'student',
    })
    console.log('Created student: student@unihostel.com / student123')
  } else {
    console.log('Student already exists')
  }

  const hostelCount = await Hostel.countDocuments()
  if (hostelCount === 0) {
    await Hostel.create([
      { name: 'North Hall', location: 'Campus North', totalRooms: 50, availableRooms: 45, pricePerBed: 1200 },
      { name: 'South Hall', location: 'Campus South', totalRooms: 40, availableRooms: 38, pricePerBed: 1100 },
    ])
    console.log('Created sample hostels')
  }

  await mongoose.disconnect()
  console.log('Seed done.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
