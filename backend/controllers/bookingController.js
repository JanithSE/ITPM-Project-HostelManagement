import Booking from '../models/Booking.js'
import Room from '../models/RoomSchema.js'
import Hostel from '../models/Hostel.js'

async function syncRoomBeds(hostelId, roomNumber) {
  if (!hostelId || !roomNumber) return

  const room = await Room.findOne({ hostel: hostelId, roomNumber: String(roomNumber) })
  if (!room) return

  const bookings = await Booking.find({
    hostel: hostelId,
    roomNumber: String(roomNumber),
    status: 'confirmed',
  }).populate('student', 'name')

  const byBed = new Map()
  for (const b of bookings) {
    const bedNumber = String(b.bedNumber)
    byBed.set(bedNumber, {
      student: b.student?._id ?? b.student ?? null,
      studentName: b.student?.name ?? null,
    })
  }

  let changed = false
  for (const bed of room.beds) {
    const bedNumber = String(bed.bedNumber)
    const occ = byBed.get(bedNumber)
    if (occ) {
      if (bed.status !== 'Occupied' || (bed.studentName ?? null) !== (occ.studentName ?? null) || String(bed.student ?? '') !== String(occ.student ?? '')) {
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

  if (changed) {
    await room.save()
  }
}

async function refreshHostelCounts(hostelId) {
  if (!hostelId) return
  const rooms = await Room.find({ hostel: hostelId }).select('beds.status')
  const totalRooms = rooms.length
  const totalBeds = rooms.reduce((sum, r) => sum + (Array.isArray(r.beds) ? r.beds.length : 0), 0)
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + (Array.isArray(r.beds) ? r.beds.filter((b) => b?.status === 'Occupied').length : 0),
    0,
  )

  await Hostel.findByIdAndUpdate(hostelId, {
    totalRooms,
    availableRooms: totalBeds - occupiedBeds,
  })
}

export const listBookings = async (req, res) => {
  try {
    let query = {}

    if (req.user.role === 'admin') {
      query = {}
    } else if (req.user.role === 'student') {
      query = { student: req.user._id }
    } else if (req.user.role === 'warden') {
      const assignedHostelName = String(req.user?.assignedHostel ?? '').trim()
      if (!assignedHostelName) return res.json([])
      const hostel = await Hostel.findOne({ name: new RegExp(`^${assignedHostelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id')
      if (!hostel) return res.json([])
      query = { hostel: hostel._id }
    } else {
      query = { student: req.user._id }
    }

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
    const booking = await Booking.create({
      ...req.body,
      student: studentId,
    })

    await syncRoomBeds(booking.hostel, booking.roomNumber)
    await refreshHostelCounts(booking.hostel)

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
    Object.assign(booking, req.body)
    await booking.save()

    await syncRoomBeds(booking.hostel, booking.roomNumber)
    await refreshHostelCounts(booking.hostel)

    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
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

    await syncRoomBeds(booking.hostel, booking.roomNumber)
    await refreshHostelCounts(booking.hostel)

    res.json({ message: 'Booking deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

