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

router.get('/my', requireRole('student'), getMyPayments)
router.get('/admin', requireRole('admin', 'warden'), getAdminPayments)
router.get('/pricing', requireRole('student'), getPaymentPricing)
router.get('/:id', getPaymentById)

router.post('/', requireRole('student'), paymentProofUploadMiddleware, createPayment)
router.put('/:id/edit-by-student', requireRole('student'), paymentProofUploadOptionalMiddleware, editPaymentByStudent)
router.delete('/:id/delete-by-student', requireRole('student'), deletePaymentByStudent)
router.patch('/:id/status', requireRole('admin', 'warden'), patchPaymentStatus)

export default router
