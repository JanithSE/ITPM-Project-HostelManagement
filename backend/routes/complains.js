import express from 'express'
import {
  listComplains,
  createComplain,
  updateComplain,
} from '../controllers/complainController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/complains – admin: all; student: own
router.get('/', listComplains)

// POST /api/complains – student
router.post('/', requireRole('student'), createComplain)

// PATCH /api/complains/:id – admin update status
router.patch('/:id', requireRole('admin'), updateComplain)

export default router
