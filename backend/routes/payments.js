import express from 'express'
import {
  getAllPayments,
  getMyPayments,
  createPayment,
  updatePaymentStatus,
} from '../controllers/paymentController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { proofUploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

// POST /api/payments – student creates their own payment
router.post('/', requireRole('student'), proofUploadMiddleware, createPayment)

// GET /api/payments/my – logged-in user only
router.get('/my', getMyPayments)

// GET /api/payments – admin: all; student: own
router.get('/', getAllPayments)

// PUT /api/payments/:id – admin updates workflow status
router.put('/:id', requireRole('admin'), updatePaymentStatus)

export default router
