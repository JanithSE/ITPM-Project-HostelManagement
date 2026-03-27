import express from 'express'
import {
  listAllInquiries,
  listMyInquiries,
  createInquiry,
  replyToInquiry,
  addInquiryComment,
} from '../controllers/inquiryController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// POST /api/inquiry — student
router.post('/', requireRole('student'), createInquiry)

// GET /api/inquiry/my — student
router.get('/my', requireRole('student'), listMyInquiries)

// GET /api/inquiry — admin
router.get('/', requireRole('admin'), listAllInquiries)

// PUT /api/inquiry/:id/reply — admin
router.put('/:id/reply', requireRole('admin'), replyToInquiry)

// POST /api/inquiry/:id/comments — student owner or admin
router.post('/:id/comments', requireRole('student', 'admin'), addInquiryComment)

export default router
