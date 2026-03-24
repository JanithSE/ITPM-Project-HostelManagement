import express from 'express'
import {
  listMaintenance,
  listMyMaintenance,
  createMaintenance,
  updateMaintenanceStatus,
} from '../controllers/maintenanceController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// POST /api/maintenance — student: create (status open, description + priority required)
router.post('/', requireRole('student'), createMaintenance)

// GET /api/maintenance/my — student: own requests
router.get('/my', requireRole('student'), listMyMaintenance)

// GET /api/maintenance — admin: all requests
router.get('/', requireRole('admin'), listMaintenance)

// PUT /api/maintenance/:id — admin: update status (open → in_progress → resolved)
router.put('/:id', requireRole('admin'), updateMaintenanceStatus)

export default router
