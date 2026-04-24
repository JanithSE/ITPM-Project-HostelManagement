/**
 * VIVA: Maintenance API routes — HTTP path layer between React (`maintenanceApi`) and `maintenanceController`.
 * `authMiddleware` verifies JWT; `requireRole` separates student vs admin; optional multer runs only for multipart.
 */
import express from 'express'
import {
  listMaintenance,
  listMyMaintenance,
  createMaintenance,
  updateMaintenanceStatus,
  updateMyMaintenance,
  deleteMyMaintenance,
} from '../controllers/maintenanceController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { maintenanceImageUploadOptionalMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

// POST /api/maintenance — student: create (status open, description + priority required)
router.post('/', requireRole('student'), maintenanceImageUploadOptionalMiddleware, createMaintenance)

// GET /api/maintenance/my — student: own requests
router.get('/my', requireRole('student'), listMyMaintenance)

// PUT /api/maintenance/:id/my — student: update own open request
router.put('/:id/my', requireRole('student'), maintenanceImageUploadOptionalMiddleware, updateMyMaintenance)

// DELETE /api/maintenance/:id/my — student: delete own open request
router.delete('/:id/my', requireRole('student'), deleteMyMaintenance)

// GET /api/maintenance — admin/warden: all requests
router.get('/', requireRole('admin', 'warden'), listMaintenance)

// PUT /api/maintenance/:id — admin/warden: update status (open → in_progress → resolved)
router.put('/:id', requireRole('admin', 'warden'), updateMaintenanceStatus)

export default router
