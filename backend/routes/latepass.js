import express from 'express'
import {
  getMyLatepass,
  getAdminLatepass,
  getLatepassById,
  createLatepass,
  patchLatepassStatus,
} from '../controllers/latepassController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { latepassDocumentUploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/my', requireRole('student'), getMyLatepass)
router.get('/admin', requireRole('admin'), getAdminLatepass)
router.get('/:id', getLatepassById)

router.post('/', requireRole('student'), latepassDocumentUploadMiddleware, createLatepass)
router.patch('/:id/status', requireRole('admin'), patchLatepassStatus)

export default router
