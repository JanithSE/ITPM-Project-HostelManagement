import express from 'express'
import Payment from '../models/Payment.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/payments – admin: all; student: own
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const payments = await Payment.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const studentId = req.user.role === 'admin' ? req.body.student : req.user._id
    const payment = await Payment.create({ ...req.body, student: studentId })
    const populated = await Payment.findById(payment._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('student', 'name email')
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    const studentId = payment.student?._id || payment.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(payment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/payments/:id
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('student', 'name email')
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    res.json(payment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
