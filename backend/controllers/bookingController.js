import Booking from '../models/Booking.js'
import Room from '../models/RoomSchema.js'

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

async function getRoomWithActiveBookings(hostelId, roomNumber) {
  const room = await Room.findOne({ hostel: hostelId, roomNumber })
  if (!room) return { room: null, activeBookings: [] }

  const activeBookings = await Booking.find({
    hostel: hostelId,
    roomNumber,
    status: { $in: ['pending', 'confirmed'] },
  })
  return { room, activeBookings }
}

function getAvailableBedNumber(room, activeBookings) {
  const allBeds = (room?.beds || []).map((b) => String(b.bedNumber))
  if (!allBeds.length) return null

  const occupied = new Set(
    activeBookings
      .map((b) => (b.bedNumber != null ? String(b.bedNumber) : null))
      .filter(Boolean),
  )

  return allBeds.find((bedNo) => !occupied.has(bedNo)) || null
}

export const listBookings = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const bookings = await Booking.find(query)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
      .sort({ createdAt: -1 })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createBooking = async (req, res) => {
  try {
    const studentId = req.user.role === 'admin' ? req.body.student : req.user._id
    const hostelId = req.body?.hostel
    const roomNumber = normalizeRoomNumber(req.body?.roomNumber)

    if (!hostelId || !roomNumber) {
      return res.status(400).json({ error: 'hostel and roomNumber are required' })
    }

    const existingByStudent = await Booking.findOne({
      student: studentId,
      status: { $in: ['pending', 'confirmed'] },
    })
    if (existingByStudent) {
      return res.status(409).json({ error: 'You already have an active booking request' })
    }

    const { room, activeBookings } = await getRoomWithActiveBookings(hostelId, roomNumber)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const capacity = Array.isArray(room.beds) ? room.beds.length : 0
    if (activeBookings.length >= capacity) {
      return res.status(409).json({ error: 'Room Full' })
    }

    const bedNumber = getAvailableBedNumber(room, activeBookings)
    if (!bedNumber) return res.status(409).json({ error: 'Room Full' })

    const booking = await Booking.create({
      ...req.body,
      student: studentId,
      hostel: hostelId,
      roomNumber,
      bedNumber,
      status: 'pending',
    })
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(booking)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (req.user.role === 'student') {
      // Students can only cancel their own booking request.
      if (req.body?.status && req.body.status !== 'cancelled') {
        return res.status(403).json({ error: 'Students can only cancel bookings' })
      }
      booking.status = 'cancelled'
    } else {
      Object.assign(booking, req.body)
    }
    await booking.save()
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const approveBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.status === 'confirmed') return res.json(booking)
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot approve a cancelled booking' })
    }

    const { room, activeBookings } = await getRoomWithActiveBookings(booking.hostel, booking.roomNumber)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const confirmedInRoom = activeBookings.filter((b) => b.status === 'confirmed')
    const capacity = Array.isArray(room.beds) ? room.beds.length : 0
    if (confirmedInRoom.length >= capacity) {
      return res.status(409).json({ error: 'Room Full' })
    }

    const bedTaken = confirmedInRoom.some((b) => String(b.bedNumber) === String(booking.bedNumber))
    if (bedTaken) {
      const freeBed = getAvailableBedNumber(room, confirmedInRoom)
      if (!freeBed) return res.status(409).json({ error: 'Room Full' })
      booking.bedNumber = freeBed
    }

    booking.status = 'confirmed'
    await booking.save()
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    return res.json(populated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const rejectBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    booking.status = 'cancelled'
    await booking.save()
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    return res.json(populated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await Booking.findByIdAndDelete(req.params.id)
    res.json({ message: 'Booking deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

