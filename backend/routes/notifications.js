import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { listMyNotifications, markNotificationRead } from '../controllers/notificationController.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student'))

router.get('/my', listMyNotifications)
router.patch('/:id/read', markNotificationRead)

export default router
