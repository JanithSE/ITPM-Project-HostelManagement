import express from 'express'
import MaintenanceRequest from '../models/MaintenanceRequest.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/maintenance – admin: all
router.get('/', async (req, res) => {
  try {
    const list = await MaintenanceRequest.find()
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/maintenance – anyone logged in
router.post('/', async (req, res) => {
  try {
    const { title, description, location } = req.body
    if (!title) return res.status(400).json({ error: 'Title required' })
    const item = await MaintenanceRequest.create({
      title,
      description: description || '',
      location: location || '',
      reportedBy: req.user._id,
    })
    const populated = await MaintenanceRequest.findById(item._id).populate('reportedBy', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/maintenance/:id – admin
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const item = await MaintenanceRequest.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('reportedBy', 'name email')
    if (!item) return res.status(404).json({ error: 'Request not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
