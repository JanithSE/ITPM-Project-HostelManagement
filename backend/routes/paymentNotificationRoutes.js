import express from 'express'
import {
  getMyPaymentNotifications,
  markPaymentNotificationAsRead,
  markAllPaymentNotificationsAsRead,
} from '../controllers/paymentNotificationController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student', 'admin', 'warden'))

router.get('/my', getMyPaymentNotifications)
router.put('/read-all', markAllPaymentNotificationsAsRead)
router.put('/:id/read', markPaymentNotificationAsRead)

export default router
