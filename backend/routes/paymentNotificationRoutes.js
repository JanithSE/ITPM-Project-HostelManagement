/** Routes for payment bell: list, mark read, mark all read, delete. Student/admin/warden allowed. */
import express from 'express'
import {
  getMyPaymentNotifications,
  markPaymentNotificationAsRead,
  markAllPaymentNotificationsAsRead,
  deletePaymentNotification,
} from '../controllers/paymentNotificationController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student', 'admin', 'warden'))

router.get('/my', getMyPaymentNotifications)
router.put('/read-all', markAllPaymentNotificationsAsRead)
router.put('/:id/read', markPaymentNotificationAsRead)
router.delete('/:id', deletePaymentNotification)

export default router
