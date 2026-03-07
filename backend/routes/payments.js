import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllPayments,
  createPayment,
  getPaymentById,
  updatePayment,
} from '../controllers/paymentController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllPayments)
router.post('/', createPayment)
router.get('/:id', getPaymentById)
router.patch('/:id', requireRole('admin'), updatePayment)

export default router
