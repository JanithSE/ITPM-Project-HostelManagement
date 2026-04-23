import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { getBookingChatHistory, postBookingChatMessage } from '../controllers/bookingChatController.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('student'))

router.post('/booking/message', postBookingChatMessage)
router.get('/booking/history/:conversationId', getBookingChatHistory)

export default router
