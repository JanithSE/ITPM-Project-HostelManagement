import express from 'express'
import Hostel from '../models/Hostel.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/hostels – student or admin
router.get('/', authMiddleware, async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 })
    res.json(hostels)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin only below
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const hostel = await Hostel.create(req.body)
    res.status(201).json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndDelete(req.params.id)
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json({ message: 'Hostel deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
