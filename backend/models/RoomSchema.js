import mongoose from 'mongoose'
import Booking from './Booking.js'
import Hostel from './Hostel.js'

// This file supports both:
// 1) Persisted "rooms" definitions (each room has 2 beds)
// 2) Computed room/bed occupancy details derived from `Booking` records

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true, enum: ['1', '2'] },
    // Occupancy is ultimately derived from `Booking`, but we keep a default
    // status so rooms can be created even before any bookings exist.
    status: { type: String, required: false, enum: ['Occupied', 'Available'], default: 'Available' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    studentName: { type: String, default: null },
  },
  { _id: false },
)

const ROOM_TYPES = ['single', 'double']
const AC_TYPES = ['ac', 'non-ac']

const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, required: true, trim: true,unique: true },
    beds: {
      type: [bedSchema],
      required: true,
      validate: {
        validator: function (v) {
          const expected = this.roomType === 'single' ? 1 : 2
          return Array.isArray(v) && v.length === expected
        },
        message: 'Beds count must match roomType (single=1, double=2)',
      },
    },
    status: { type: String, enum: ['available', 'occupied'], default: 'available', required: true },
    /** Metadata used to define the number of bed slots for occupancy. */
    roomType: { type: String, enum: ROOM_TYPES, default: 'double' },
    details: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

export { ROOM_TYPES, AC_TYPES }

const RoomModel = mongoose.models.Room ?? mongoose.model('Room', roomSchema)

function normalizeBedNumber(bedNumber) {
  if (bedNumber === undefined || bedNumber === null) return null
  const s = String(bedNumber).toLowerCase().trim()
  const m = s.match(/(\d+)/)
  if (!m) return null
  const n = m[1]
  return n === '1' || n === '2' ? n : null
}

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

function buildRoomDetailsForHostel(hostel, bookings, { bedCount = 2, bedCountByRoomNumber = null, roomNumbers = null } = {}) {

  // Map: roomNumber -> bedNumber -> { student, studentName }
  const bedOccupancy = new Map()
  for (const b of bookings) {
    const roomNumber = normalizeRoomNumber(b.roomNumber)
    const bedNumber = normalizeBedNumber(b.bedNumber)
    if (!roomNumber || !bedNumber) continue

    if (!bedOccupancy.has(roomNumber)) bedOccupancy.set(roomNumber, new Map())
    bedOccupancy.get(roomNumber).set(bedNumber, {
      student: b.student?._id ?? b.student,
      studentName: b.student?.name ?? null,
    })
  }

  // Build room number list:
  // - prefer persisted `Room` docs when provided
  // - always include any booked roomNumbers that weren't in that list
  const roomNumberSet = new Set()
  if (Array.isArray(roomNumbers) && roomNumbers.length > 0) {
    for (const rn of roomNumbers) {
      const normalized = normalizeRoomNumber(rn)
      if (normalized) roomNumberSet.add(String(normalized))
    }
  }

  for (const b of bookings) {
    const rn = normalizeRoomNumber(b.roomNumber)
    if (rn) roomNumberSet.add(String(rn))
  }

  const sortedRoomNumbers = Array.from(roomNumberSet).sort((a, b) => Number(a) - Number(b))

  // Final response shape expected by the UI:
  // Each room has beds count based on roomType, with Occupied/Available status + studentName.
  const rooms = sortedRoomNumbers.map((roomNumber) => {
    const roomBedMap = bedOccupancy.get(roomNumber) ?? new Map()

    const bedCountForRoom = bedCountByRoomNumber?.get(roomNumber) ?? bedCount
    const bedsPerRoom = Array.from({ length: bedCountForRoom }, (_, i) => String(i + 1))

    const beds = bedsPerRoom.map((bedNumber) => {
      const occ = roomBedMap.get(bedNumber)
      const isOccupied = Boolean(occ)
      return {
        bedNumber,
        status: isOccupied ? 'Occupied' : 'Available',
        student: occ?.student ?? null,
        studentName: occ?.studentName ?? null,
      }
    })

    // "special studentName who using the room" - represent both bed occupants.
    const occupiedNames = beds
      .filter((x) => x.status === 'Occupied' && x.studentName)
      .map((x) => x.studentName)

    return {
      hostel: { _id: hostel._id, name: hostel.name },
      roomNumber,
      studentName: occupiedNames.length ? occupiedNames.join(', ') : null,
      beds,
    }
  })

  return rooms
}

/**
 * Compute room occupancy for a specific hostel.
 * Bed is considered occupied when booking.status is in `statusesToCount`.
 */
export async function getRoomsDetailsForHostel(hostelId, { statusesToCount = ['confirmed'] } = {}) {
  const hostel = await Hostel.findById(hostelId)
  if (!hostel) return []

  const rooms = await RoomModel.find({ hostel: hostelId }).select('roomNumber roomType')
  const persistedRoomNumbers = rooms.map((r) => r.roomNumber)
  const bedCountByRoomNumber = new Map()
  for (const r of rooms) {
    const rn = normalizeRoomNumber(r.roomNumber)
    if (!rn) continue
    bedCountByRoomNumber.set(String(rn), r.roomType === 'single' ? 1 : 2)
  }

  const bookings = await Booking.find({
    hostel: hostelId,
    status: { $in: statusesToCount },
  }).populate('student', 'name')

  return buildRoomDetailsForHostel(hostel, bookings, { roomNumbers: persistedRoomNumbers, bedCountByRoomNumber })
}

/**
 * Compute room occupancy for all hostels.
 */
export async function getAllRoomsDetails({ statusesToCount = ['confirmed'] } = {}) {
  const hostels = await Hostel.find({})
  const all = []

  for (const hostel of hostels) {
    const rooms = await getRoomsDetailsForHostel(hostel._id, { statusesToCount })
    all.push(...rooms)
  }

  return all
}

export const RoomSchema = roomSchema
export default RoomModel

