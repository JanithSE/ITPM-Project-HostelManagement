import express from 'express'
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/inventoryController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

// GET /api/inventory
router.get('/', listInventory)

// POST /api/inventory
router.post('/', createInventoryItem)

// PATCH /api/inventory/:id
router.patch('/:id', updateInventoryItem)

// DELETE /api/inventory/:id
router.delete('/:id', deleteInventoryItem)

export default router
