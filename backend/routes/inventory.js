import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/inventoryController.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/', getAllInventoryItems)
router.post('/', createInventoryItem)
router.patch('/:id', updateInventoryItem)
router.delete('/:id', deleteInventoryItem)

export default router
