import express from 'express'
import {
  listLatepasses,
  createLatepass,
  updateLatepass,
} from '../controllers/latepassController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/latepass – admin: all; student: own
router.get('/', listLatepasses)

// POST /api/latepass – student
router.post('/', requireRole('student'), createLatepass)

// PATCH /api/latepass/:id – admin approve/reject
router.patch('/:id', requireRole('admin'), updateLatepass)

export default router
