import 'dotenv/config'
import mongoose from 'mongoose'
import Hostel from '../models/Hostel.js'
import Room from '../models/RoomSchema.js'
import Booking from '../models/Booking.js'
import Payment from '../models/Payment.js'

const HOSTEL_NAME = 'Green View Hostel'
const PAID_STATUSES = ['completed', 'paid']
/** Extra 2-bed rooms with no bookings (merged with rooms implied by payments). */
const EXTRA_EMPTY_ROOMS = ['102', '103']

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

function buildDefaultBeds() {
  return [
    { bedNumber: '1', status: 'Available', student: null, studentName: null },
    { bedNumber: '2', status: 'Available', student: null, studentName: null },
  ]
}

async function refreshHostelCounts(hostelId) {
  const rooms = await Room.find({ hostel: hostelId }).select('beds.bedNumber beds.status')
  const roomsCount = rooms.length
  const totalBeds = rooms.reduce((sum, r) => sum + (Array.isArray(r.beds) ? r.beds.length : 0), 0)
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + (Array.isArray(r.beds) ? r.beds.filter((b) => b?.status === 'Occupied').length : 0),
    0,
  )
  await Hostel.findByIdAndUpdate(hostelId, {
    totalRooms: roomsCount,
    availableRooms: totalBeds - occupiedBeds,
  })
}

async function main() {
  const uri = process.env.MongoDB_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MongoDB_URI or MONGODB_URI in .env')
    process.exit(1)
  }

  await mongoose.connect(uri)

  const hostel = await Hostel.findOne({ name: HOSTEL_NAME })
  if (!hostel) {
    console.error(`Hostel "${HOSTEL_NAME}" not found`)
    await mongoose.disconnect()
    process.exit(1)
  }

  const payments = await Payment.find({ status: { $in: PAID_STATUSES } })
    .sort({ createdAt: 1 })
    .lean()

  /** roomNumber -> ordered unique students (first payment wins per student) */
  const roomToStudents = new Map()

  for (const p of payments) {
    const rn = normalizeRoomNumber(p.roomNo)
    if (!rn) continue
    const sid = String(p.student)
    if (!roomToStudents.has(rn)) roomToStudents.set(rn, [])
    const list = roomToStudents.get(rn)
    if (!list.some((x) => String(x.studentId) === sid)) {
      list.push({ studentId: p.student, studentName: p.studentName })
    }
  }

  const roomNumbers = [...roomToStudents.keys()].sort((a, b) => Number(a) - Number(b))

  if (roomNumbers.length === 0) {
    const fallback = ['101', '102', '103']
    for (const rn of fallback) roomToStudents.set(rn, [])
    roomNumbers.push(...fallback)
    console.log('No completed/paid payments found; creating default rooms:', fallback.join(', '))
  } else {
    for (const rn of EXTRA_EMPTY_ROOMS) {
      if (!roomToStudents.has(rn)) roomToStudents.set(rn, [])
    }
    roomNumbers.length = 0
    roomNumbers.push(...[...roomToStudents.keys()].sort((a, b) => Number(a) - Number(b)))
  }

  let roomsCreated = 0
  for (const roomNumber of roomNumbers) {
    const existing = await Room.findOne({ hostel: hostel._id, roomNumber })
    if (!existing) {
      await Room.create({
        hostel: hostel._id,
        roomNumber,
        beds: buildDefaultBeds(),
      })
      roomsCreated += 1
    }
  }

  let bookingsCreated = 0
  for (const [roomNumber, students] of roomToStudents) {
    const existingBookings = await Booking.find({
      hostel: hostel._id,
      roomNumber,
      status: { $in: ['pending', 'confirmed'] },
    })
    const bedsUsed = new Set(
      existingBookings.map((b) => String(b.bedNumber || '')).filter(Boolean),
    )

    for (const { studentId } of students) {
      if (bedsUsed.size >= 2) {
        console.warn(`Room ${roomNumber}: more than 2 beds; skipping extra paying students`)
        break
      }

      const dup = await Booking.findOne({
        hostel: hostel._id,
        roomNumber,
        student: studentId,
        status: { $in: ['pending', 'confirmed'] },
      })
      if (dup) continue

      const bedNumber = !bedsUsed.has('1') ? '1' : !bedsUsed.has('2') ? '2' : null
      if (!bedNumber) break

      bedsUsed.add(bedNumber)
      await Booking.create({
        student: studentId,
        hostel: hostel._id,
        roomNumber,
        bedNumber,
        status: 'confirmed',
      })
      bookingsCreated += 1
    }
  }

  await refreshHostelCounts(hostel._id)

  const totalRooms = await Room.countDocuments({ hostel: hostel._id })

  console.log(JSON.stringify({
    hostel: HOSTEL_NAME,
    hostelId: String(hostel._id),
    roomsCreated,
    totalRoomsAtHostel: totalRooms,
    bookingsCreated,
    roomNumbers,
  }, null, 2))

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
