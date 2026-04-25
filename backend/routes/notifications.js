import express from 'express'
import { getMyNotifications, markNotificationAsRead } from '../controllers/notificationController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student', 'admin'))

router.get('/', getMyNotifications)
router.put('/:id/read', markNotificationAsRead)

export default router
