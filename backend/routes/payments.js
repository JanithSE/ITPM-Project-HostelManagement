import express from 'express'
import {
  listPayments,
  createPayment,
  getPaymentById,
  updatePayment,
} from '../controllers/paymentController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/payments – admin: all; student: own
router.get('/', listPayments)

// POST /api/payments
router.post('/', createPayment)

// GET /api/payments/:id
router.get('/:id', getPaymentById)

// PATCH /api/payments/:id
router.patch('/:id', requireRole('admin'), updatePayment)

export default router
