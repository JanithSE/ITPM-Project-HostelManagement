import express from 'express'
import {
  getHostels,
  createHostel,
  getHostelById,
  updateHostel,
  deleteHostel,
} from '../controllers/hostelController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/hostels – student or admin
router.get('/', authMiddleware, getHostels)

// Admin only below
router.post('/', authMiddleware, requireRole('admin'), createHostel)

router.get('/:id', authMiddleware, getHostelById)

router.patch('/:id', authMiddleware, requireRole('admin'), updateHostel)

router.delete('/:id', authMiddleware, requireRole('admin'), deleteHostel)

export default router
