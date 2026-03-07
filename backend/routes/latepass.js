import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllLatePasses,
  createLatePass,
  updateLatePass,
} from '../controllers/latePassController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllLatePasses)
router.post('/', requireRole('student'), createLatePass)
router.patch('/:id', requireRole('admin'), updateLatePass)

export default router
