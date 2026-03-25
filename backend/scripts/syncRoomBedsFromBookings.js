import 'dotenv/config'
import mongoose from 'mongoose'
import Hostel from '../models/Hostel.js'
import Room from '../models/RoomSchema.js'
import Booking from '../models/Booking.js'
// Ensure User model is registered so Booking.populate('student') works.
import '../models/User.js'

async function syncRoomBeds(hostelId, roomNumber) {
  const room = await Room.findOne({ hostel: hostelId, roomNumber: String(roomNumber) })
  if (!room) return { roomNumber, updated: false }

  const bookings = await Booking.find({
    hostel: hostelId,
    roomNumber: String(roomNumber),
    status: 'confirmed',
  }).populate('student', 'name')

  const byBed = new Map()
  for (const b of bookings) {
    byBed.set(String(b.bedNumber), {
      student: b.student?._id ?? b.student ?? null,
      studentName: b.student?.name ?? null,
    })
  }

  let changed = false
  for (const bed of room.beds) {
    const occ = byBed.get(String(bed.bedNumber))
    if (occ) {
      if (bed.status !== 'Occupied' || String(bed.student ?? '') !== String(occ.student ?? '') || (bed.studentName ?? null) !== (occ.studentName ?? null)) {
        bed.status = 'Occupied'
        bed.student = occ.student
        bed.studentName = occ.studentName
        changed = true
      }
    } else {
      if (bed.status !== 'Available' || bed.student != null || bed.studentName != null) {
        bed.status = 'Available'
        bed.student = null
        bed.studentName = null
        changed = true
      }
    }
  }

  if (changed) await room.save()
  return { roomNumber, updated: changed }
}

async function main() {
  const uri = process.env.MongoDB_URI || process.env.MONGODB_URI
  if (!uri) throw new Error('Set MongoDB_URI or MONGODB_URI in .env')

  await mongoose.connect(uri)

  const hostels = await Hostel.find({})
  let roomsScanned = 0
  let roomsUpdated = 0

  for (const h of hostels) {
    const rooms = await Room.find({ hostel: h._id }).select('roomNumber')
    roomsScanned += rooms.length

    for (const room of rooms) {
      const r = await syncRoomBeds(h._id, room.roomNumber)
      if (r.updated) roomsUpdated += 1
    }

    // Refresh hostel totals based on the synced Room.beds statuses.
    const updatedRooms = await Room.find({ hostel: h._id }).select('beds.status')
    const totalBeds = updatedRooms.reduce((sum, r) => sum + (Array.isArray(r.beds) ? r.beds.length : 0), 0)
    const occupiedBeds = updatedRooms.reduce(
      (sum, r) => sum + (Array.isArray(r.beds) ? r.beds.filter((b) => b?.status === 'Occupied').length : 0),
      0,
    )

    await Hostel.findByIdAndUpdate(h._id, {
      totalRooms: updatedRooms.length,
      availableRooms: totalBeds - occupiedBeds,
    })
  }

  console.log(JSON.stringify({ roomsScanned, roomsUpdated }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})

