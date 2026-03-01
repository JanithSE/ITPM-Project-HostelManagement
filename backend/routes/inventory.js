import express from 'express'
import InventoryItem from '../models/InventoryItem.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

// GET /api/inventory
router.get('/', async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ name: 1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/inventory
router.post('/', async (req, res) => {
  try {
    const item = await InventoryItem.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/inventory/:id
router.patch('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json({ message: 'Item deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
