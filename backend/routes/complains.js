import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllComplains,
  createComplain,
  updateComplain,
} from '../controllers/complainController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllComplains)
router.post('/', requireRole('student'), createComplain)
router.patch('/:id', requireRole('admin'), updateComplain)

export default router
