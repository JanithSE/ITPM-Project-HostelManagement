import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { exportBookings } from '../controllers/exportController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/bookings', requireRole('admin', 'warden'), exportBookings)

export default router
