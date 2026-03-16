import express from 'express'
import {
  listInquiries,
  createInquiry,
  getInquiryById,
  updateInquiry,
} from '../controllers/inquiryController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/inquiries – admin: all; student: own
router.get('/', listInquiries)

// POST /api/inquiries – student
router.post('/', requireRole('student'), createInquiry)

// GET /api/inquiries/:id
router.get('/:id', getInquiryById)

// PATCH /api/inquiries/:id – admin reply
router.patch('/:id', requireRole('admin'), updateInquiry)

export default router
