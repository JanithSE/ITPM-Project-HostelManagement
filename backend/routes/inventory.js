import express from 'express'
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  chatInventoryAssistant,
} from '../controllers/inventoryController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/inventory
router.get('/', requireRole('admin', 'warden'), listInventory)

// POST /api/inventory/chat
router.post('/chat', requireRole('admin', 'warden'), chatInventoryAssistant)

// POST /api/inventory — warden can add stock for their operations
router.post('/', requireRole('admin', 'warden'), createInventoryItem)

// PATCH /api/inventory/:id
router.patch('/:id', requireRole('admin', 'warden'), updateInventoryItem)

// DELETE /api/inventory/:id
router.delete('/:id', requireRole('admin'), deleteInventoryItem)

export default router
