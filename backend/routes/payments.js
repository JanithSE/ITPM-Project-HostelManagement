/**
 * Payment REST routes. All routes require auth; role + upload middleware per action.
 * Order: static paths (`/my`, `/admin`, `/pricing`) before `/:id` so they are not captured as ids.
 */
import express from 'express'
import {
  getMyPayments,
  getAdminPayments,
  getPaymentById,
  getPaymentPricing,
  createPayment,
  patchPaymentStatus,
  editPaymentByStudent,
  deletePaymentByStudent,
} from '../controllers/paymentController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { paymentProofUploadMiddleware, paymentProofUploadOptionalMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

// Student list & catalog
router.get('/my', requireRole('student'), getMyPayments)
router.get('/admin', requireRole('admin', 'warden'), getAdminPayments)
router.get('/pricing', requireRole('student'), getPaymentPricing)
// Single document: role checked inside controller
router.get('/:id', getPaymentById)

// Create / student edit-delete / staff status
router.post('/', requireRole('student'), paymentProofUploadMiddleware, createPayment)
router.put('/:id/edit-by-student', requireRole('student'), paymentProofUploadOptionalMiddleware, editPaymentByStudent)
router.delete('/:id/delete-by-student', requireRole('student'), deletePaymentByStudent)
router.patch('/:id/status', requireRole('admin', 'warden'), patchPaymentStatus)

export default router
