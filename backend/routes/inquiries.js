import express from 'express'
import Inquiry from '../models/Inquiry.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/inquiries – admin: all; student: own
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { from: req.user._id }
    const inquiries = await Inquiry.find(query)
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/inquiries – student
router.post('/', requireRole('student'), async (req, res) => {
  try {
    const { subject, message } = req.body
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' })
    const inquiry = await Inquiry.create({ from: req.user._id, subject, message })
    const populated = await Inquiry.findById(inquiry._id).populate('from', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/inquiries/:id
router.get('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).populate('from', 'name email')
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })
    const fromId = inquiry.from?._id || inquiry.from
    if (req.user.role === 'student' && fromId && !fromId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(inquiry)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/inquiries/:id – admin reply
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })
    if (req.body.reply != null) {
      inquiry.reply = req.body.reply
      inquiry.repliedAt = new Date()
      inquiry.status = 'replied'
    }
    if (req.body.status != null) inquiry.status = req.body.status
    await inquiry.save()
    const populated = await Inquiry.findById(inquiry._id).populate('from', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
