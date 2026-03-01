import express from 'express'
import Booking from '../models/Booking.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/bookings – admin: all; student: own
router.get('/', async (req, res) => {
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
})

// POST /api/bookings – student or admin
router.post('/', async (req, res) => {
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
})

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
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
})

// PATCH /api/bookings/:id – admin or own
router.patch('/:id', async (req, res) => {
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
})

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
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
})

export default router
