import express from 'express'
import Complain from '../models/Complain.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/complains – admin: all; student: own
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const complains = await Complain.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(complains)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/complains – student
router.post('/', requireRole('student'), async (req, res) => {
  try {
    const { subject, description } = req.body
    if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' })
    const complain = await Complain.create({ student: req.user._id, subject, description })
    const populated = await Complain.findById(complain._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/complains/:id – admin update status
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const complain = await Complain.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('student', 'name email')
    if (!complain) return res.status(404).json({ error: 'Complain not found' })
    res.json(complain)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
