import Room from '../models/RoomSchema.js'
import Hostel from '../models/Hostel.js'
import Booking from '../models/Booking.js'
import { getAllRoomsDetails, getRoomsDetailsForHostel } from '../models/RoomSchema.js'

function getHostelIdFromBody(body) {
  return body?.hostel || body?.hostelId || body?.hostel_id || null
}

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

function normalizeRoomType(v) {
  const s = String(v ?? '').toLowerCase().trim()
  return s === 'single' ? 'single' : 'double'
}

function normalizeAcType(v) {
  const s = String(v ?? '').toLowerCase().trim()
  return s === 'ac' ? 'ac' : 'non-ac'
}

function normalizeBedNumber(bedNumber) {
  if (bedNumber === undefined || bedNumber === null) return null
  const s = String(bedNumber).toLowerCase().trim()
  const m = s.match(/(\d+)/)
  if (!m) return null
  const n = m[1]
  return n === '1' || n === '2' ? n : null
}

function getBedCountFromRoomType(roomType) {
  return roomType === 'single' ? 1 : 2
}

function buildDefaultBeds(bedCount) {
  return Array.from({ length: bedCount }, (_, i) => ({
    bedNumber: String(i + 1),
    status: 'Available',
    student: null,
    studentName: null,
  }))
}

function normalizeBedsInput(bedsInput, bedCount) {
  const allowedBedNumbers = Array.from({ length: bedCount }, (_, i) => String(i + 1))

  // If beds are not provided, default based on bedCount.
  if (!Array.isArray(bedsInput) || bedsInput.length === 0) return buildDefaultBeds(bedCount)

  const bedMap = new Map()
  for (const b of bedsInput) {
    const bedNumber = normalizeBedNumber(b?.bedNumber)
    if (!bedNumber) continue
    if (!allowedBedNumbers.includes(bedNumber)) continue

    bedMap.set(bedNumber, {
      bedNumber,
      status: 'Available',
      student: null,
      studentName: null,
    })
  }

  return allowedBedNumbers.map(
    (bn) => bedMap.get(bn) ?? { bedNumber: bn, status: 'Available', student: null, studentName: null },
  )
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

export const listRooms = async (req, res) => {
  try {
    const hostelId = req.query.hostelId ? String(req.query.hostelId) : null
    const query = hostelId ? { hostel: hostelId } : {}

    const rooms = await Room.find(query).sort({ roomNumber: 1 })
    res.json(rooms)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createRoom = async (req, res) => {
  try {
    const hostelId = getHostelIdFromBody(req.body)
    const roomNumber = normalizeRoomNumber(req.body?.roomNumber)

    if (!hostelId) return res.status(400).json({ error: 'hostel is required' })
    if (!roomNumber) return res.status(400).json({ error: 'roomNumber is required' })

    const existing = await Room.findOne({ hostel: hostelId, roomNumber })
    if (existing) return res.status(409).json({ error: 'Room already exists in this hostel' })

    const details = String(req.body?.details ?? '').trim().slice(0, 2000)
    const roomType = normalizeRoomType(req.body?.roomType)
    const acType = normalizeAcType(req.body?.acType)
    const bedCount = getBedCountFromRoomType(roomType)

    const room = await Room.create({
      hostel: hostelId,
      roomNumber,
      beds: normalizeBedsInput(req.body?.beds, bedCount),
      roomType,
      acType,
      details,
    })

    await refreshHostelCounts(hostelId)

    res.status(201).json(room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const oldHostelId = room.hostel
    const oldRoomNumber = room.roomNumber
    const oldRoomType = room.roomType

    const nextRoomNumber = req.body?.roomNumber !== undefined ? normalizeRoomNumber(req.body.roomNumber) : room.roomNumber
    if (!nextRoomNumber) return res.status(400).json({ error: 'roomNumber is invalid' })

    const nextHostelId = req.body?.hostel !== undefined || req.body?.hostelId !== undefined
      ? getHostelIdFromBody(req.body)
      : room.hostel

    if (!nextHostelId) return res.status(400).json({ error: 'hostel is invalid' })

    // If hostel/roomNumber changes, ensure uniqueness in target hostel.
    const dup = await Room.findOne({
      _id: { $ne: room._id },
      hostel: nextHostelId,
      roomNumber: nextRoomNumber,
    })
    if (dup) return res.status(409).json({ error: 'Another room with this roomNumber already exists' })

    room.roomNumber = nextRoomNumber
    room.hostel = nextHostelId

    const nextRoomType = req.body?.roomType !== undefined ? normalizeRoomType(req.body.roomType) : room.roomType
    const nextBedCount = getBedCountFromRoomType(nextRoomType)

    // Allow optional bed structure update, but occupancy remains derived from `Booking`.
    if (req.body?.beds !== undefined) room.beds = normalizeBedsInput(req.body.beds, nextBedCount)
    if (req.body?.roomType !== undefined) {
      room.roomType = nextRoomType

      // If roomType changes and beds were not explicitly provided, rebuild beds to satisfy validation.
      if (req.body?.beds === undefined) {
        // If converting double -> single, cancel bookings that used bed 2.
        const oldBedCount = getBedCountFromRoomType(oldRoomType)
        if (oldBedCount === 2 && nextBedCount === 1) {
          await Booking.updateMany(
            {
              hostel: nextHostelId,
              roomNumber: nextRoomNumber,
              bedNumber: '2',
              status: { $in: ['pending', 'confirmed'] },
            },
            { $set: { status: 'cancelled' } },
          )
        }
        room.beds = buildDefaultBeds(nextBedCount)
      }
    }
    if (req.body?.acType !== undefined) room.acType = normalizeAcType(req.body.acType)
    if (req.body?.details !== undefined) room.details = String(req.body.details ?? '').trim().slice(0, 2000)

    await room.save()

    // Keep bookings consistent with the room/hostel change so occupancy updates immediately.
    if (
      String(oldHostelId) !== String(nextHostelId) ||
      String(oldRoomNumber) !== String(nextRoomNumber)
    ) {
      await Booking.updateMany(
        { hostel: oldHostelId, roomNumber: oldRoomNumber },
        { $set: { hostel: nextHostelId, roomNumber: nextRoomNumber } },
      )
    }

    // Refresh counts for affected hostels.
    if (String(oldHostelId) !== String(nextHostelId)) {
      await Promise.all([refreshHostelCounts(oldHostelId), refreshHostelCounts(nextHostelId)])
    } else if (String(oldRoomNumber) !== String(nextRoomNumber)) {
      await refreshHostelCounts(nextHostelId)
    } else {
      await refreshHostelCounts(nextHostelId)
    }

    res.json(room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    // Cancel bookings tied to this room so beds become available again.
    await Booking.updateMany(
      { hostel: room.hostel, roomNumber: room.roomNumber, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } }
    )

    await Room.findByIdAndDelete(req.params.id)

    await refreshHostelCounts(room.hostel)

    res.json({ message: 'Room deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const listRoomDetails = async (req, res) => {
  try {
    const hostelId = req.query.hostelId
    const statusesToCount = req.query.statusesToCount
      ? String(req.query.statusesToCount).split(',').map((s) => s.trim()).filter(Boolean)
      : ['confirmed']

    if (hostelId) {
      const details = await getRoomsDetailsForHostel(hostelId, { statusesToCount })
      return res.json(details)
    }

    const details = await getAllRoomsDetails({ statusesToCount })
    return res.json(details)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

