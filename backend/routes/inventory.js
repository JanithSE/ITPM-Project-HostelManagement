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

// GET /api/inventory
router.get('/', requireRole('admin', 'warden'), listInventory)

// POST /api/inventory
router.post('/', requireRole('admin'), createInventoryItem)

// PATCH /api/inventory/:id
router.patch('/:id', requireRole('admin'), updateInventoryItem)

// DELETE /api/inventory/:id
router.delete('/:id', requireRole('admin'), deleteInventoryItem)

export default router
