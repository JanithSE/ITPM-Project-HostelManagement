import express from 'express'
import {
  getMyLatepass,
  getAdminLatepass,
  getLatepassById,
  createLatepass,
  patchLatepassStatus,
  editLatepassByStudent,
  deleteLatepassByStudent,
} from '../controllers/latepassController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { latepassDocumentUploadMiddleware, latepassDocumentUploadOptionalMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/my', requireRole('student'), getMyLatepass)
router.get('/admin', requireRole('admin'), getAdminLatepass)
router.get('/:id', getLatepassById)

router.post('/', requireRole('student'), latepassDocumentUploadMiddleware, createLatepass)
router.put('/:id/edit-by-student', requireRole('student'), latepassDocumentUploadOptionalMiddleware, editLatepassByStudent)
router.delete('/:id/delete-by-student', requireRole('student'), deleteLatepassByStudent)
router.patch('/:id/status', requireRole('admin'), patchLatepassStatus)

export default router
