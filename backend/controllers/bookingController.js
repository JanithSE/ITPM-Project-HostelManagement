import Booking from '../models/Booking.js'

export const getAllBookings = async (req, res) => {
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
    const booking = await Booking.create({
      ...req.body,
      student: studentId,
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
    Object.assign(booking, req.body)
    await booking.save()
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
    res.json({ message: 'Booking deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
