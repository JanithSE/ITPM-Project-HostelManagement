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

function normalizeBedNumber(bedNumber) {
  if (bedNumber === undefined || bedNumber === null) return null
  const s = String(bedNumber).toLowerCase().trim()
  const m = s.match(/(\d+)/)
  if (!m) return null
  const n = m[1]
  return n === '1' || n === '2' ? n : null
}

function buildDefaultBeds() {
  return [
    { bedNumber: '1', status: 'Available', student: null, studentName: null },
    { bedNumber: '2', status: 'Available', student: null, studentName: null },
  ]
}

function normalizeBedsInput(bedsInput) {
  // If beds are not provided, always default to 2 beds.
  if (!Array.isArray(bedsInput) || bedsInput.length === 0) return buildDefaultBeds()

  const bedMap = new Map()
  for (const b of bedsInput) {
    const bedNumber = normalizeBedNumber(b?.bedNumber)
    if (!bedNumber) continue

    bedMap.set(bedNumber, {
      bedNumber,
      status: 'Available',
      student: null,
      studentName: null,
    })
  }

  // Ensure exactly 2 beds (1 and 2).
  const result = ['1', '2'].map((bn) => bedMap.get(bn) ?? { bedNumber: bn, status: 'Available', student: null, studentName: null })
  return result
}

async function refreshHostelCounts(hostelId) {
  const roomsCount = await Room.countDocuments({ hostel: hostelId })
  const totalBeds = roomsCount * 2
  const occupiedBeds = await Booking.countDocuments({
    hostel: hostelId,
    status: { $in: ['confirmed'] },
  })

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

    const room = await Room.create({
      hostel: hostelId,
      roomNumber,
      beds: normalizeBedsInput(req.body?.beds),
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

    // Allow optional bed structure update, but occupancy remains derived from `Booking`.
    if (req.body?.beds !== undefined) room.beds = normalizeBedsInput(req.body.beds)

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

