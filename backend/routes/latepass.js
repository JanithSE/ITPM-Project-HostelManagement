import express from 'express'
import {
  getAllLatepass,
  getMyLatepass,
  createLatepass,
  updateLatepassStatus,
} from '../controllers/latepassController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// POST /api/latepass – student creates their own latepass
router.post('/', requireRole('student'), createLatepass)

// GET /api/latepass/my – logged-in user only
router.get('/my', getMyLatepass)

// GET /api/latepass – admin: all; student: own
router.get('/', getAllLatepass)

// PUT /api/latepass/:id – admin updates workflow status
router.put('/:id', requireRole('admin'), updateLatepassStatus)

export default router
