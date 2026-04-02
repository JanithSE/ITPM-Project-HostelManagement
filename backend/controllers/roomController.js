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
  return m[1]
}

function buildDefaultBeds(count = 2) {
  const n = Number(count)
  const safe = Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 1), 8) : 2
  return Array.from({ length: safe }, (_, i) => ({
    bedNumber: String(i + 1),
    status: 'Available',
    student: null,
    studentName: null,
  }))
}

function normalizeBedsInput(bedsInput, roomType = null) {
  // If beds are not provided, default based on room type.
  if (!Array.isArray(bedsInput) || bedsInput.length === 0) {
    return roomType === 'single' ? buildDefaultBeds(1) : buildDefaultBeds(2)
  }

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

  const sorted = Array.from(bedMap.values()).sort((a, b) => Number(a.bedNumber) - Number(b.bedNumber))
  if (!sorted.length) return roomType === 'single' ? buildDefaultBeds(1) : buildDefaultBeds(2)
  const result = sorted
  return result
}

function normalizeCapacity(capacityInput, roomType = null) {
  if (capacityInput !== undefined && capacityInput !== null && String(capacityInput).trim() !== '') {
    const n = Number(capacityInput)
    if (Number.isFinite(n)) return Math.max(1, Math.min(8, Math.trunc(n)))
  }
  return roomType === 'single' ? 1 : 2
}

async function refreshHostelCounts(hostelId) {
  const rooms = await Room.find({ hostel: hostelId }).select('beds')
  const roomsCount = rooms.length
  const totalBeds = rooms.reduce((sum, r) => sum + (Array.isArray(r.beds) ? r.beds.length : 0), 0)
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

    const roomType = req.body?.roomType === 'single' ? 'single' : (req.body?.roomType === 'sharing' ? 'sharing' : null)
    const block = ['A', 'B', 'C'].includes(String(req.body?.block || '').toUpperCase())
      ? String(req.body?.block || '').toUpperCase()
      : null
    const acType = req.body?.acType === 'ac' ? 'ac' : (req.body?.acType === 'non-ac' ? 'non-ac' : null)
    const bathType = req.body?.bathType === 'attached' ? 'attached' : 'common'
    const floor = req.body?.floor !== undefined ? Number(req.body.floor) : 0
    if (!Number.isFinite(floor) || floor < 0) return res.status(400).json({ error: 'floor must be a non-negative number' })
    const capacity = normalizeCapacity(req.body?.capacity, roomType)
    const price = req.body?.price !== undefined ? Number(req.body.price) : 0
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'price must be a positive number' })
    const status = req.body?.status
    if (status !== undefined && !['available', 'reserved', 'occupied'].includes(status)) {
      return res.status(400).json({ error: 'status must be available, reserved or occupied' })
    }
    const hasBalcony = Boolean(req.body?.hasBalcony)
    const hasAttachedBath = req.body?.hasAttachedBath !== undefined ? Boolean(req.body?.hasAttachedBath) : bathType === 'attached'
    const hasKitchen = Boolean(req.body?.hasKitchen)
    const furnishedLevel = ['basic', 'semi', 'fully'].includes(req.body?.furnishedLevel) ? req.body.furnishedLevel : 'semi'
    const securityDeposit = req.body?.securityDeposit !== undefined ? Number(req.body.securityDeposit) : 0
    if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
      return res.status(400).json({ error: 'securityDeposit must be a positive number' })
    }

    const room = await Room.create({
      hostel: hostelId,
      roomNumber,
      block,
      floor: Math.trunc(floor),
      capacity,
      price,
      status: status || 'available',
      roomType,
      acType,
      bathType,
      hasBalcony,
      hasAttachedBath,
      hasKitchen,
      furnishedLevel,
      securityDeposit,
      beds: normalizeBedsInput(
        req.body?.beds || Array.from({ length: capacity }, (_, i) => ({ bedNumber: String(i + 1) })),
        roomType
      ),
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

    if (req.body?.block !== undefined) {
      const block = String(req.body.block || '').toUpperCase()
      if (!['A', 'B', 'C'].includes(block)) return res.status(400).json({ error: 'block must be A, B or C' })
      room.block = block
    }
    if (req.body?.floor !== undefined) {
      const floor = Number(req.body.floor)
      if (!Number.isFinite(floor) || floor < 0) return res.status(400).json({ error: 'floor must be a non-negative number' })
      room.floor = Math.trunc(floor)
    }
    if (req.body?.capacity !== undefined) {
      const capacity = normalizeCapacity(req.body.capacity, room.roomType)
      room.capacity = capacity
      if (req.body?.beds === undefined) {
        room.beds = normalizeBedsInput(
          Array.from({ length: capacity }, (_, i) => ({ bedNumber: String(i + 1) })),
          room.roomType
        )
      }
    }
    if (req.body?.price !== undefined) {
      const price = Number(req.body.price)
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'price must be a positive number' })
      room.price = price
    }
    if (req.body?.status !== undefined) {
      if (!['available', 'reserved', 'occupied'].includes(req.body.status)) {
        return res.status(400).json({ error: 'status must be available, reserved or occupied' })
      }
      room.status = req.body.status
    }
    if (req.body?.roomType !== undefined) {
      if (!['single', 'sharing'].includes(req.body.roomType)) {
        return res.status(400).json({ error: 'roomType must be single or sharing' })
      }
      room.roomType = req.body.roomType
      if (req.body?.beds === undefined) {
        room.beds = normalizeBedsInput(room.beds, room.roomType)
      }
    }
    if (req.body?.acType !== undefined) {
      if (!['ac', 'non-ac'].includes(req.body.acType)) {
        return res.status(400).json({ error: 'acType must be ac or non-ac' })
      }
      room.acType = req.body.acType
    }
    if (req.body?.bathType !== undefined) {
      if (!['attached', 'common'].includes(req.body.bathType)) {
        return res.status(400).json({ error: 'bathType must be attached or common' })
      }
      room.bathType = req.body.bathType
      room.hasAttachedBath = req.body.bathType === 'attached'
    }
    if (req.body?.hasBalcony !== undefined) room.hasBalcony = Boolean(req.body.hasBalcony)
    if (req.body?.hasAttachedBath !== undefined) room.hasAttachedBath = Boolean(req.body.hasAttachedBath)
    if (req.body?.hasKitchen !== undefined) room.hasKitchen = Boolean(req.body.hasKitchen)
    if (req.body?.furnishedLevel !== undefined) {
      if (!['basic', 'semi', 'fully'].includes(req.body.furnishedLevel)) {
        return res.status(400).json({ error: 'furnishedLevel must be basic, semi or fully' })
      }
      room.furnishedLevel = req.body.furnishedLevel
    }
    if (req.body?.securityDeposit !== undefined) {
      const securityDeposit = Number(req.body.securityDeposit)
      if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
        return res.status(400).json({ error: 'securityDeposit must be a positive number' })
      }
      room.securityDeposit = securityDeposit
    }

    // Optional bed structure update, occupancy remains derived from `Booking`.
    if (req.body?.beds !== undefined) room.beds = normalizeBedsInput(req.body.beds, room.roomType)

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

