import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllInquiries,
  createInquiry,
  getInquiryById,
  updateInquiry,
} from '../controllers/inquiryController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllInquiries)
router.post('/', requireRole('student'), createInquiry)
router.get('/:id', getInquiryById)
router.patch('/:id', requireRole('admin'), updateInquiry)

export default router
