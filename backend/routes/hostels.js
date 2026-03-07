import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllHostels,
  createHostel,
  getHostelById,
  updateHostel,
  deleteHostel,
} from '../controllers/hostelController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllHostels)
router.post('/', authMiddleware, requireRole('admin'), createHostel)
router.get('/:id', authMiddleware, getHostelById)
router.patch('/:id', authMiddleware, requireRole('admin'), updateHostel)
router.delete('/:id', authMiddleware, requireRole('admin'), deleteHostel)

export default router
