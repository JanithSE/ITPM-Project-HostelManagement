import express from 'express'
import {
  listMaintenance,
  createMaintenance,
  updateMaintenance,
} from '../controllers/maintenanceController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/maintenance – admin: all
router.get('/', listMaintenance)

// POST /api/maintenance – anyone logged in
router.post('/', createMaintenance)

// PATCH /api/maintenance/:id – admin
router.patch('/:id', requireRole('admin'), updateMaintenance)

export default router
