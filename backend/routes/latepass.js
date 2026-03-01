import express from 'express'
import LatePass from '../models/LatePass.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/latepass – admin: all; student: own
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const passes = await LatePass.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(passes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/latepass – student
router.post('/', requireRole('student'), async (req, res) => {
  try {
    const pass = await LatePass.create({ student: req.user._id, ...req.body })
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/latepass/:id – admin approve/reject
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const pass = await LatePass.findById(req.params.id)
    if (!pass) return res.status(404).json({ error: 'Late pass not found' })
    if (req.body.status) {
      pass.status = req.body.status
      if (['approved', 'rejected'].includes(req.body.status)) {
        pass.approvedBy = req.user._id
        pass.approvedAt = new Date()
      }
    }
    await pass.save()
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
