import mongoose from 'mongoose'
import Booking from './Booking.js'
import Hostel from './Hostel.js'

// This file supports both:
// 1) Persisted "rooms" definitions (each room has 2 beds)
// 2) Computed room/bed occupancy details derived from `Booking` records

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true },
    // Occupancy is ultimately derived from `Booking`, but we keep a default
    // status so rooms can be created even before any bookings exist.
    status: { type: String, required: false, enum: ['Occupied', 'Available'], default: 'Available' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    studentName: { type: String, default: null },
  },
  { _id: false },
)

const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, required: true, trim: true },
    block: { type: String, trim: true, uppercase: true, enum: ['A', 'B', 'C'] },
    floor: { type: Number, min: 0, max: 50, default: 0 },
    capacity: { type: Number, min: 1, max: 8, default: 2 },
    price: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['available', 'reserved', 'occupied'], default: 'available' },
    roomType: { type: String, trim: true, enum: ['single', 'sharing'] },
    acType: { type: String, trim: true, enum: ['ac', 'non-ac'] },
    bathType: { type: String, trim: true, enum: ['attached', 'common'], default: 'common' },
    hasBalcony: { type: Boolean, default: false },
    hasAttachedBath: { type: Boolean, default: false },
    hasKitchen: { type: Boolean, default: false },
    furnishedLevel: { type: String, trim: true, enum: ['basic', 'semi', 'fully'], default: 'semi' },
    securityDeposit: { type: Number, min: 0, default: 0 },
    beds: { type: [bedSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
  },
  { timestamps: true },
)

const RoomModel = mongoose.models.Room ?? mongoose.model('Room', roomSchema)

function normalizeBedNumber(bedNumber) {
  if (bedNumber === undefined || bedNumber === null) return null
  const s = String(bedNumber).toLowerCase().trim()
  const m = s.match(/(\d+)/)
  if (!m) return null
  return m[1]
}

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

function buildRoomDetailsForHostel(hostel, bookings, { persistedRooms = [] } = {}) {
  const roomMeta = new Map(
    persistedRooms.map((r) => [
      String(normalizeRoomNumber(r.roomNumber)),
      {
        block: r.block || null,
        floor: Number.isFinite(r.floor) ? r.floor : 0,
        capacity: Number.isFinite(r.capacity) ? r.capacity : null,
        price: Number.isFinite(r.price) ? r.price : 0,
        status: r.status || null,
        roomType: r.roomType || null,
        acType: r.acType || null,
        bathType: r.bathType || 'common',
        hasBalcony: Boolean(r.hasBalcony),
        hasAttachedBath: Boolean(r.hasAttachedBath),
        hasKitchen: Boolean(r.hasKitchen),
        furnishedLevel: r.furnishedLevel || 'semi',
        securityDeposit: Number.isFinite(r.securityDeposit) ? r.securityDeposit : 0,
        beds: Array.isArray(r.beds) ? r.beds : [],
      },
    ]),
  )

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
  if (Array.isArray(persistedRooms) && persistedRooms.length > 0) {
    for (const r of persistedRooms) {
      const rn = r?.roomNumber
      const normalized = normalizeRoomNumber(rn)
      if (normalized) roomNumberSet.add(String(normalized))
    }
  }

  for (const b of bookings) {
    const rn = normalizeRoomNumber(b.roomNumber)
    if (rn) roomNumberSet.add(String(rn))
  }

  const sortedRoomNumbers = Array.from(roomNumberSet).sort((a, b) => Number(a) - Number(b))

  // Final response shape expected by the UI: each room has 2 beds with
  // Occupied/Available status + studentName (if occupied).
  const rooms = sortedRoomNumbers.map((roomNumber) => {
    const meta = roomMeta.get(String(roomNumber))
    const bedNumbers = (meta?.beds || [])
      .map((b) => normalizeBedNumber(b?.bedNumber))
      .filter(Boolean)
    const uniqueBedNumbers = Array.from(new Set(bedNumbers))
    const bedsPerRoom = uniqueBedNumbers.length
      ? uniqueBedNumbers
      : ['1', '2']
    const roomBedMap = bedOccupancy.get(roomNumber) ?? new Map()

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
      block: meta?.block || null,
      floor: meta?.floor ?? 0,
      capacity: meta?.capacity || beds.length,
      price: meta?.price ?? 0,
      status: meta?.status || (beds.every((x) => x.status === 'Occupied') ? 'occupied' : beds.some((x) => x.status === 'Occupied') ? 'reserved' : 'available'),
      roomType: meta?.roomType || null,
      acType: meta?.acType || null,
      bathType: meta?.bathType || (meta?.hasAttachedBath ? 'attached' : 'common'),
      hasBalcony: Boolean(meta?.hasBalcony),
      hasAttachedBath: Boolean(meta?.hasAttachedBath),
      hasKitchen: Boolean(meta?.hasKitchen),
      furnishedLevel: meta?.furnishedLevel || 'semi',
      securityDeposit: meta?.securityDeposit ?? 0,
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

  const persistedRooms = await RoomModel.find({ hostel: hostelId })
    .select('roomNumber beds block floor capacity price status roomType acType bathType hasBalcony hasAttachedBath hasKitchen furnishedLevel securityDeposit')

  const bookings = await Booking.find({
    hostel: hostelId,
    status: { $in: statusesToCount },
  }).populate('student', 'name')

  return buildRoomDetailsForHostel(hostel, bookings, { persistedRooms })
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

