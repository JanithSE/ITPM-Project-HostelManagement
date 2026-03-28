import express from 'express'
import {
  getMyPayments,
  getAdminPayments,
  getPaymentById,
  getPaymentPricing,
  createPayment,
  patchPaymentStatus,
} from '../controllers/paymentController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { paymentProofUploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/my', requireRole('student'), getMyPayments)
router.get('/admin', requireRole('admin'), getAdminPayments)
router.get('/pricing', requireRole('student'), getPaymentPricing)
router.get('/:id', getPaymentById)

router.post('/', requireRole('student'), paymentProofUploadMiddleware, createPayment)
router.patch('/:id/status', requireRole('admin'), patchPaymentStatus)

export default router
