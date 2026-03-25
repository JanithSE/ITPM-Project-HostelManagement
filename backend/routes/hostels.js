import express from 'express'
import {
  getHostels,
  createHostel,
  getHostelById,
  updateHostel,
  deleteHostel,
} from '../controllers/hostelController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { conditionalHostelImageUpload } from '../middleware/upload.js'

const router = express.Router()

// GET /api/hostels – student or admin
router.get('/', authMiddleware, getHostels)

// Admin only below (JSON or multipart with optional field `image`)
router.post('/', authMiddleware, requireRole('admin'), conditionalHostelImageUpload, createHostel)

router.get('/:id', authMiddleware, getHostelById)

router.patch('/:id', authMiddleware, requireRole('admin'), conditionalHostelImageUpload, updateHostel)

router.delete('/:id', authMiddleware, requireRole('admin'), deleteHostel)

export default router
