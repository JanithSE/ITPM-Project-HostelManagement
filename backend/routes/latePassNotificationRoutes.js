import express from 'express'
import {
  getMyLatePassNotifications,
  markLatePassNotificationAsRead,
  markAllLatePassNotificationsAsRead,
} from '../controllers/latePassNotificationController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student', 'admin', 'warden'))

router.get('/my', getMyLatePassNotifications)
router.put('/read-all', markAllLatePassNotificationsAsRead)
router.put('/:id/read', markLatePassNotificationAsRead)

export default router
