/**
 * Late pass REST routes. Auth on all; upload middleware on create/edit-with-file.
 * Status PATCH is admin-only; admin delete uses separate path with role check in controller.
 */
import express from 'express'
import {
  getMyLatepass,
  getAdminLatepass,
  getLatepassById,
  createLatepass,
  patchLatepassStatus,
  editLatepassByStudent,
  deleteLatepassByStudent,
  deleteLatepassByAdmin,
} from '../controllers/latepassController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { latepassDocumentUploadMiddleware, latepassDocumentUploadOptionalMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/my', requireRole('student'), getMyLatepass)
router.get('/admin', requireRole('admin', 'warden'), getAdminLatepass)
// Detail: access rules inside controller (admin vs student)
router.get('/:id', getLatepassById)

router.post('/', requireRole('student'), latepassDocumentUploadMiddleware, createLatepass)
router.put('/:id/edit-by-student', requireRole('student'), latepassDocumentUploadOptionalMiddleware, editLatepassByStudent)
router.delete('/:id/delete-by-student', requireRole('student'), deleteLatepassByStudent)
router.delete('/:id/delete-by-admin', requireRole('admin', 'warden'), deleteLatepassByAdmin)
router.patch('/:id/status', requireRole('admin'), patchLatepassStatus)

export default router
