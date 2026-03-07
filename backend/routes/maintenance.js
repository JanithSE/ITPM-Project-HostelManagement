import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
} from '../controllers/maintenanceController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllMaintenanceRequests)
router.post('/', createMaintenanceRequest)
router.patch('/:id', requireRole('admin'), updateMaintenanceRequest)

export default router
