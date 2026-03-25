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

  /** Files in backend/uploads/hostels — served at /uploads/hostels/<filename> */
  const presetHostels = [
    {
      name: 'Emerald Grove Residences',
      location: 'Malabe – Near SLIIT & Horizon Campus',
      description: 'Quiet, greenery-filled environment perfect for focused students.',
      totalRooms: 180,
      availableRooms: 180,
      pricePerBed: 18000,
      amenities: ['Wi-Fi', 'Study rooms', 'Laundry'],
      imageUrl: '/uploads/hostels/hostel1.JPG',
    },
    {
      name: 'Urban Nest Living',
      location: 'Malabe South – Kothalawala Area',
      description: 'Lively and social atmosphere close to food spots and transport.',
      totalRooms: 150,
      availableRooms: 150,
      pricePerBed: 15000,
      amenities: ['Wi-Fi', 'Common room', 'Parking'],
      imageUrl: '/uploads/hostels/hostel2.jpg',
    },
    {
      name: 'Skyline Elite Hostel',
      location: 'Malabe Town – Premium',
      description: 'Modern premium hostel with hotel-like facilities and 24/7 security.',
      totalRooms: 120,
      availableRooms: 120,
      pricePerBed: 25000,
      amenities: ['Wi-Fi', 'Attached bath', '24/7 Security'],
      imageUrl: '/uploads/hostels/hostel3.jpg',
    },
    {
      name: 'Lakeview Budget Stay',
      location: 'Rajagiriya Area',
      description: 'Affordable and peaceful stay with easy access to Colombo city.',
      totalRooms: 200,
      availableRooms: 200,
      pricePerBed: 12000,
      amenities: ['Wi-Fi', 'Garden', 'Shared kitchen'],
      imageUrl: '/uploads/hostels/hostel1.JPG',
    },
  ]

  const created = []
  const imageUpdates = []
  for (const hostelPreset of presetHostels) {
    const exists = await Hostel.findOne({ name: hostelPreset.name })
    if (!exists) {
      await Hostel.create(hostelPreset)
      created.push(hostelPreset.name)
      continue
    }
    if (hostelPreset.imageUrl && exists.imageUrl !== hostelPreset.imageUrl) {
      await Hostel.updateOne({ _id: exists._id }, { $set: { imageUrl: hostelPreset.imageUrl } })
      imageUpdates.push(hostelPreset.name)
    }
  }

  if (created.length > 0) console.log(`Created hostels: ${created.join(', ')}`)
  else console.log('Preset hostels already exist')
  if (imageUpdates.length > 0) console.log(`Updated hostel images: ${imageUpdates.join(', ')}`)

  await mongoose.disconnect()
  console.log('Seed done.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
